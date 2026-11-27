import Decimal from 'decimal.js'
import { addMonths, dateKey, daysBetween, cashFlows } from './engine.ts'
import type { Asset, Currency, FxRates } from './model.ts'

const D = Decimal.clone({ precision: 32, rounding: Decimal.ROUND_HALF_UP })
const rubOnly: FxRates = { RUB: 1, USD: 1, CNY: 1, EUR: 1 }

export type EventKind = 'accrual' | 'income' | 'principal' | 'reinvestment' | 'valuation' | 'fee' | 'assessment' | 'tax' | 'contribution' | 'withdrawal' | 'transfer'
export interface FinancialEvent {
  date: string
  instrument: string
  name: string
  instrumentType?: Asset['kind']
  type: EventKind
  amount: number
  currency: Currency
  rubles: number
  source: string
  status: 'forecast' | 'confirmed'
}

export const eventNames: Record<EventKind, string> = {
  accrual: 'Начисление дохода', income: 'Выплата дохода', principal: 'Возврат номинала',
  reinvestment: 'Реинвестирование', valuation: 'Переоценка', fee: 'Комиссия',
  assessment: 'Налоговое обязательство', tax: 'Уплата налога', contribution: 'Пополнение',
  withdrawal: 'Изъятие', transfer: 'Перевод внутри портфеля',
}

export function financialEventLabel(entry: FinancialEvent) {
  if (entry.type !== 'income') return eventNames[entry.type]
  const kind = entry.instrumentType
  if (kind === 'ОФЗ' || kind?.includes('облигации')) return 'Купон'
  if (kind === 'ЦФА') return 'Выплата ЦФА'
  if (kind === 'Вклады' || kind === 'Накопительные счета') return 'Банковские проценты'
  return eventNames.income
}

export interface YearProjection {
  year: number
  inflation: number
  savingsRateShift: number
  valuationShift: number
  bondYieldShift: number
  creditSpreadShift: number
  taxAssumption: number
  fx: FxRates
}

export interface ProjectionOptions {
  monthlyContribution?: number
  monthlyWithdrawal?: number
  inflation?: number
  savingsRateShift?: number
  reinvestRate?: number
  valuationShift?: number
  bondYieldShift?: number
  creditSpreadShift?: number
  taxAssumption?: number
  earlyExit?: boolean
  fx?: FxRates
  years?: ReadonlyMap<number, YearProjection>
}

const cents = (value: Decimal.Value) => new D(value).toDecimalPlaces(2)
export function money(value: Decimal.Value) {
  const amount = cents(value)
  return amount.isZero() ? 0 : amount.toNumber()
}

function event(asset: Asset, fx: FxRates, date: string, type: EventKind, amount: Decimal.Value, source: string): FinancialEvent {
  const local = cents(amount)
  return { date, instrument: asset.id, name: asset.name, instrumentType: asset.kind, type, amount: local.toNumber(), currency: asset.currency, rubles: money(local.times(fx[asset.currency])), source, status: 'forecast' }
}

const yearAt = (options: ProjectionOptions, day: string) => options.years?.get(Number(day.slice(0, 4)))
const fxAt = (options: ProjectionOptions, fallback: FxRates, day: string) => yearAt(options, day)?.fx ?? fallback

function compoundYears(start: string, end: string, rate: (year: string) => number, basis: (year: string) => number) {
  let value = new D(1)
  for (let from = start; from < end;) {
    const next = (Number(from.slice(0, 4)) + 1) + '-01-01'
    const until = next < end ? next : end
    value = value.times(new D(Math.max(0, 1 + rate(from) / 100)).pow(new D(daysBetween(from, until)).div(basis(from))))
    from = until
  }
  return value
}

function daysInYear(date: string) {
  const y = Number(date.slice(0, 4))
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365
}

const balanceProduct = (a: Asset) => a.kind === 'Вклады' || a.kind === 'Накопительные счета'
const priceProduct = (a: Asset) => ['ПИФы', 'Акции', 'Золото'].includes(a.kind)

function nextPayment(anchor: string, start: string, frequency: number) {
  let low = 1
  let high = Math.max(1, Math.ceil(daysBetween(anchor, start) / 28) + 1)
  while (low < high) {
    const index = Math.floor((low + high) / 2)
    if (addMonths(anchor, index * 12 / frequency) > start) high = index
    else low = index + 1
  }
  return low
}

function balanceEvents(asset: Asset, start: string, end: string, fx: FxRates, options: ProjectionOptions) {
  const terms = asset.contract
  const maturity = asset.maturity || end
  const close = options.earlyExit && asset.kind === 'Вклады' && end < maturity
  const events: FinancialEvent[] = []
  const anchor = asset.scheduleStart ?? start
  let paymentAnchor = anchor
  let index = nextPayment(anchor, start, asset.frequency)
  let due = addMonths(paymentAnchor, index * 12 / asset.frequency)
  let balance = cents(asset.amount)
  let minBalance = balance
  let interest = new D(0)
  let effectiveRate = asset.rate
  let periods: { rate: number; basis: number }[] = []
  const movements = new Map(terms?.movements?.map(row => [row.date, row.amount]))
  const changes = [...terms?.rateChanges ?? []].sort((a, b) => a.date.localeCompare(b.date))
  let changeIndex = 0
  const savings = asset.kind === 'Накопительные счета'
  let activeMaturity = maturity
  const duration = asset.maturity ? daysBetween(anchor, asset.maturity) : 0

  for (let t = Date.parse(start) + 86400000; t <= Date.parse(end); t += 86400000) {
    const day = dateKey(new Date(t))
    if (day <= anchor) continue
    while (changes[changeIndex]?.date <= day) effectiveRate = changes[changeIndex++].rate
    const movement = movements.get(day)
    if (movement) {
      const delta = Decimal.max(movement, balance.negated())
      balance = balance.plus(delta)
      events.push(event(asset, fx, day, 'transfer', delta, 'План движения средств внутри портфеля'))
    }
    minBalance = Decimal.min(minBalance, balance)
    const rate = Math.max(0, effectiveRate + (savings ? yearAt(options, day)?.savingsRateShift ?? options.savingsRateShift ?? 0 : 0))
    const basis = daysInYear(day)
    if (terms?.accrual === 'minimum') periods.push({ rate, basis })
    else interest = interest.plus(balance.times(rate).div(100 * basis))

    const atMaturity = day === activeMaturity && Boolean(asset.maturity)
    const isClosing = close && day === end
    if (day === due || atMaturity || isClosing) {
      let amount = terms?.accrual === 'minimum'
        ? periods.reduce((sum, p) => sum.plus(minBalance.times(p.rate).div(100 * p.basis)), new D(0))
        : interest
      if (isClosing) {
        const early = terms?.earlyRate ?? 0
        // The settlement restores the contract's early rate by reversing excess interest; capitalized excess reduces principal.
        const previousInterest = events.filter(e => e.type === 'accrual').reduce((sum, e) => sum.plus(e.amount), new D(0))
        const earlyInterest = new D(asset.amount).times(early).times(daysBetween(start, end)).div(36500)
        amount = earlyInterest.minus(previousInterest)
      }
      if (!cents(amount).isZero()) {
        const source = isClosing ? 'Досрочное закрытие · ACT/365 на исходную сумму' : terms?.accrual === 'minimum' ? 'Минимальный остаток · ACT/ACT' : 'Ежедневный остаток · ACT/ACT'
        events.push(event(asset, fx, day, 'accrual', amount, source), event(asset, fx, day, 'income', amount, source))
        if (terms?.capitalization) {
          balance = balance.plus(cents(amount))
          events.push(event(asset, fx, day, 'reinvestment', amount, source))
        }
      }
      if (isClosing || (atMaturity && terms?.renewalRate === undefined)) {
        events.push(event(asset, fx, day, 'principal', balance, 'Возврат остатка'))
        break
      }
      if (atMaturity) {
        effectiveRate = terms!.renewalRate!
        paymentAnchor = day
        index = 0
        activeMaturity = dateKey(new Date(Date.parse(day) + duration * 86400000))
      }
      due = addMonths(paymentAnchor, ++index * 12 / asset.frequency)
      interest = new D(0)
      minBalance = balance
      periods = []
    }
  }
  return events
}

function datedAssetEvents(asset: Asset, start: string, end: string, fx: FxRates, options: ProjectionOptions) {
  const events: FinancialEvent[] = []
  if (asset.maturity && asset.maturity <= start) return events
  const terms = asset.contract
  const add = (date: string, type: EventKind, value: Decimal.Value, source: string) => {
    if (!cents(value).isZero()) events.push(event(asset, fx, date, type, value, source))
  }
  const income = (date: string, amount: number, source: string) => {
    add(date, 'accrual', amount, source)
    add(date, 'income', amount, source)
  }
  if (balanceProduct(asset) && terms?.accrual && terms.accrual !== 'interim') return balanceEvents(asset, start, end, fx, options)

  if (priceProduct(asset)) {
    const rate = (day: string) => asset.rate + (yearAt(options, day)?.valuationShift ?? options.valuationShift ?? 0)
    let previous = cents(asset.amount)
    const last = asset.maturity && asset.maturity < end ? asset.maturity : end
    for (let n = 1; ; n++) {
      const monthEnd = addMonths(start, n)
      const day = monthEnd < last ? monthEnd : last
      const value = cents(new D(asset.amount).times(compoundYears(start, day, rate, () => 365)))
      add(day, 'valuation', value.minus(previous), 'Годовой сценарий цены · ACT/365')
      previous = value
      if (day === last) {
        if (asset.maturity === day) add(day, 'principal', value, 'Модельная реализация позиции')
        break
      }
    }
  } else if (terms?.schedule?.length) {
    for (const row of terms.schedule.filter(row => row.date > start && row.date <= end)) {
      income(row.date, row.income, 'Денежный график по введённым условиям')
      add(row.date, 'principal', row.principal, 'График амортизации и погашения')
    }
  } else if (!['Валюты', 'Денежный резерв'].includes(asset.kind)) {
    const adjusted: Asset = { ...asset, amount: terms?.principal ?? asset.amount, rate: Math.max(0, asset.rate + (asset.kind === 'Накопительные счета' ? options.savingsRateShift ?? 0 : 0)) }
    const varies = asset.kind === 'Накопительные счета' && !!options.years?.size
    const flows = cashFlows([varies ? { ...adjusted, rate: 1 } : adjusted], rubOnly, start, end)
    for (const flow of flows) {
      if (flow.type === 'Погашение') add(flow.date, 'principal', flow.amount, 'Договорный номинал или введённая оценка')
      else {
        const override = asset.kind === 'Накопительные счета' ? yearAt(options, flow.date)?.savingsRateShift : undefined
        const fallbackRate = asset.rate + (options.savingsRateShift ?? 0)
        const payment = varies ? flow.amount * Math.max(0, override === undefined ? fallbackRate : asset.rate + override) : flow.amount
        income(flow.date, payment, 'Регулярная ставка · пропорциональный неполный период')
      }
    }
  }
  return events
}

export function eventTotals(events: FinancialEvent[]) {
  const sum = (...kinds: EventKind[]) => events.filter(e => kinds.includes(e.type)).reduce((total, entry) => total.plus(entry.rubles), new D(0)).toNumber()
  const accrued = sum('accrual'), valuation = sum('valuation'), fees = sum('fee'), assessed = sum('assessment')
  const contribution = sum('contribution'), withdrawn = sum('withdrawal')
  return {
    accrued, valuation, fees, assessed, contribution, withdrawn, paid: sum('income'), taxPaid: sum('tax'), principal: sum('principal'),
    gross: money(new D(accrued).plus(valuation)), net: money(new D(accrued).plus(valuation).minus(fees).minus(assessed)),
    cashFlow: money(new D(sum('income', 'principal')).minus(sum('reinvestment', 'fee', 'tax'))),
  }
}

export function projectLedger(assets: Asset[], fx: FxRates, start: string, months: number, freeCapital = 0, options: ProjectionOptions = {}) {
  const end = addMonths(start, months)
  const projectedFx = options.fx ?? fx
  const opening = money(assets.reduce((sum, a) => sum.plus(event(a, fx, start, 'valuation', a.amount, 'Входная оценка').rubles), new D(freeCapital)))
  const cash: Asset = { id: 'cash', name: 'Свободный капитал', kind: 'Денежный резерв', issuer: 'Портфель', amount: 0, cost: 0, rate: 0, currency: 'RUB', liquidity: 'Высокий', risk: 'Низкий', maturity: '', frequency: 12 }
  const warnings: string[] = []
  if (assets.some(a => a.maturity && a.maturity <= start)) warnings.push('Истёкшие позиции включены во входную оценку. Подтвердите их погашение или скорректируйте остаток.')
  const events: FinancialEvent[] = months > 0 ? assets.flatMap(asset => {
    const list = datedAssetEvents(asset, start, end, projectedFx, options)

    if (asset.kind === 'ОФЗ' || asset.kind.includes('облигации')) {
      const remaining = asset.maturity ? Math.max(0, daysBetween(start, asset.maturity) / 365) : 5
      const isGovernment = asset.kind === 'ОФЗ'
      const shockAt = (day: string) => {
        const year = yearAt(options, day)
        return (year?.bondYieldShift ?? options.bondYieldShift ?? 0) + (isGovernment ? 0 : year?.creditSpreadShift ?? options.creditSpreadShift ?? 0)
      }
      if (remaining > 0 && (options.years?.size || shockAt(start))) {
        let previous = new D(0)
        for (let month = 1; month <= months; month++) {
          const monthEnd = addMonths(start, month)
          const day = asset.maturity && asset.maturity < monthEnd ? asset.maturity : monthEnd
          const time = day === asset.maturity ? remaining : month / 12
          const shock = shockAt(day)
          const duration = Math.min(5, Math.max(0, remaining - time)) / (1 + asset.rate / 100)
          const priceDelta = Math.max(-1, -duration * shock / 100)
          const value = cents(new D(asset.amount).times(priceDelta))
          if (!value.equals(previous)) list.push(event(asset, projectedFx, day, 'valuation', value.minus(previous), 'Линейное приближение по остаточной дюрации'))
          previous = value
          if (duration === 0) break
        }
      }
    }
    const principal = asset.contract?.principal
    if (principal && principal !== asset.amount && !balanceProduct(asset)) {
      const amortized = list.filter(e => e.type === 'principal').reduce((sum, e) => sum.plus(e.amount), new D(0))
      const convergence = amortized.times(new D(principal).minus(asset.amount)).div(principal)
      for (const redemption of list.filter(e => e.type === 'principal')) {
        const adjustment = amortized.isZero() ? new D(0) : convergence.times(redemption.amount).div(amortized)
        if (!adjustment.isZero()) list.push(event(asset, projectedFx, redemption.date, 'valuation', adjustment, 'Сближение оценки с возвращённым номиналом'))
      }
    }
    const monthlyFee = new D(asset.amount).times(asset.contract?.annualFee ?? 0).div(1200)
    for (let i = 1; !cents(monthlyFee).isZero() && i <= months; i++) {
      const day = addMonths(start, i)
      if (asset.maturity && day > asset.maturity) break
      list.push(event(asset, projectedFx, day, 'fee', monthlyFee, 'Отдельно введённая ежегодная комиссия на исходную оценку'))
    }
    if (options.years?.size) {
      list.sort((a, b) => a.date.localeCompare(b.date))
      let openValue = cents(asset.amount)
      let currentFx = fx[asset.currency]
      let cursor = 0
      const fxMarks: FinancialEvent[] = []
      const revalue = (day: string) => {
        const nextFx = fxAt(options, projectedFx, day)[asset.currency]
        if (nextFx !== currentFx && openValue.isPositive()) {
          fxMarks.push(event({ ...asset, currency: 'RUB' }, rubOnly, day, 'valuation', openValue.times(new D(nextFx).minus(currentFx)), 'Валютная переоценка по сценарию года'))
        }
        currentFx = nextFx
      }
      revalue(start)
      for (let year = Number(start.slice(0, 4)) + 1; year <= Number(end.slice(0, 4)); year++) {
        const day = year + '-01-01'
        while (cursor < list.length && list[cursor].date < day) {
          const entry = list[cursor++]
          if (['valuation', 'reinvestment', 'transfer', 'principal'].includes(entry.type)) {
            openValue = openValue.plus(entry.type === 'principal' ? -entry.amount : entry.amount)
          }
        }
        revalue(day)
      }
      return [...list.map(entry => ({ ...entry, rubles: money(new D(entry.amount).times(fxAt(options, projectedFx, entry.date)[asset.currency])) })), ...fxMarks]
    }
    if (projectedFx[asset.currency] !== fx[asset.currency]) {
      list.push(event({ ...asset, currency: 'RUB' }, rubOnly, start, 'valuation', new D(asset.amount).times(new D(projectedFx[asset.currency]).minus(fx[asset.currency])), 'Мгновенный валютный шок'))
    }
    return list
  }) : []
  if (options.reinvestRate) {
    const growth = new D(1 + options.reinvestRate / 100)
    for (const payment of events.filter(e => e.type === 'income' && e.amount > 0)) {
      const alreadyCapitalized = assets.find(a => a.id === payment.instrument)?.contract?.capitalization
      if (alreadyCapitalized) continue
      const years = daysBetween(payment.date, end) / 365
      const extra = money(new D(payment.rubles).times(growth.pow(years).minus(1)))
      if (extra) {
        events.push(event(cash, fx, payment.date, 'reinvestment', payment.rubles, 'Реинвестирование выплаченного дохода'))
        events.push(event(cash, fx, end, 'valuation', extra, 'Прирост при реинвестировании · ACT/365'))
      }
    }
  }
  if (options.years?.size || (options.taxAssumption && options.taxAssumption > 0)) {
    const byYear = new Map<string, { net: Decimal; date: string }>()
    const taxable = events.filter(e => ['income', 'valuation', 'fee'].includes(e.type))
    for (const entry of taxable) {
      const year = entry.date.slice(0, 4)
      const current = byYear.get(year) ?? { net: new D(0), date: year + '-12-31' }
      current.net = current.net.plus(entry.type === 'fee' ? -entry.rubles : entry.rubles)
      byYear.set(year, current)
    }
    for (const bucket of byYear.values()) {
      const tax = money(Decimal.max(0, bucket.net).times(yearAt(options, bucket.date)?.taxAssumption ?? options.taxAssumption ?? 0).div(100))
      if (tax) events.push(event(cash, fx, bucket.date < end ? bucket.date : end, 'assessment', tax, 'Условный налог на положительный результат года'))
    }
  }
  const sorted = events.sort((a, b) => a.date.localeCompare(b.date))
  const points = [{ date: start, value: opening, real: opening, gross: 0, net: 0 }]
  let cursor = 0
  let running = new D(opening)
  let liquid = new D(freeCapital).plus(assets.filter(a => a.kind === 'Денежный резерв').reduce((sum, a) => sum.plus(money(new D(a.amount).times(fx[a.currency]))), new D(0)))
  let gross = new D(0), net = new D(0)
  const result: FinancialEvent[] = []
  for (let i = 1; i <= months; i++) {
    const date = addMonths(start, i)
    const from = cursor
    while (cursor < sorted.length && sorted[cursor].date <= date) cursor++
    const slice = sorted.slice(from, cursor)
    const totals = eventTotals(slice)
    const reserveRevaluation = slice.filter(e => e.type === 'valuation' && e.instrumentType === 'Денежный резерв' &&
      (e.source === 'Мгновенный валютный шок' || e.source === 'Валютная переоценка по сценарию года')).reduce((sum, e) => sum.plus(e.rubles), new D(0))
    liquid = liquid.plus(totals.cashFlow).plus(reserveRevaluation).minus(slice.filter(e => e.type === 'transfer').reduce((sum, e) => sum.plus(e.rubles), new D(0)))
    if (liquid.isNegative() && !warnings.includes('Плановые переводы или расходы превышают свободные средства. Проверьте финансирование.')) {
      warnings.push('Плановые переводы или расходы превышают свободные средства. Проверьте финансирование.')
    }
    const contribution = money(options.monthlyContribution ?? 0)
    if (contribution > 0) slice.push(event(cash, fx, date, 'contribution', contribution, 'Запланированное ежемесячное пополнение'))
    const desired = options.monthlyWithdrawal ?? 0
    const withdrawal = Decimal.max(0, Decimal.min(desired, liquid.plus(contribution))).toNumber()
    if (withdrawal < desired && !warnings.includes('Часть изъятий ограничена ликвидными средствами.')) warnings.push('Часть изъятий ограничена ликвидными средствами.')
    if (withdrawal > 0) slice.push(event(cash, fx, date, 'withdrawal', withdrawal, 'Плановое изъятие из доступных денег'))
    liquid = liquid.plus(contribution).minus(withdrawal)
    running = running.plus(totals.net).plus(contribution).minus(withdrawal)
    gross = gross.plus(totals.gross)
    net = net.plus(totals.net)
    const priceIndex = options.years?.size ? compoundYears(start, date, day => yearAt(options, day)?.inflation ?? options.inflation ?? 0, daysInYear)
      : new D(1 + (options.inflation ?? 0) / 100).pow(new D(i).div(12))
    points.push({ date, value: running.toNumber(), real: money(running.div(priceIndex)), gross: gross.toNumber(), net: net.toNumber() })
    result.push(...slice)
  }
  return { opening, end, points, events: result, warnings, final: points.at(-1)!, totals: eventTotals(result) }
}
