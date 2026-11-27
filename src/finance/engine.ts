import type { Asset, CashFlow, FxRates } from './model.ts'

export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function addMonths(key: string, months: number) {
  const date = new Date(key)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months + 1, 0)
  date.setUTCDate(Math.min(day, date.getUTCDate()))
  return dateKey(date)
}

export function daysBetween(from: string, to: string) {
  return (Date.parse(to) - Date.parse(from)) / 86400000
}

export function contributionReturn(principal: number, rate: number, months: number, frequency: number, inflation: number, tax: number) {
  const years = months / 12
  const fullPeriods = Math.floor(months * frequency / 12)
  const remainder = frequency === 0 ? years : (months * frequency % 12) / (12 * frequency)
  const capitalized = frequency === 0 ? 1 : (1 + rate / frequency) ** fullPeriods
  const growth = capitalized * (1 + rate * remainder)
  const gross = principal * (growth - 1)
  const taxAmount = Math.max(0, gross) * tax
  const net = gross - taxAmount
  const total = principal + net
  const real = total / principal / (1 + inflation) ** years - 1
  return { gross, taxAmount, net, total, real }
}

function paymentType(asset: Asset): CashFlow['type'] {
  if (asset.kind.includes('облигации') || asset.kind === 'ОФЗ') return 'Купон'
  if (asset.kind === 'Акции' || asset.kind === 'ПИФы') return 'Дивиденды'
  if (asset.kind === 'ЦФА') return 'Выплата ЦФА'
  return 'Проценты'
}

export function cashFlows(assets: Asset[], fx: FxRates, start: string, end: string): CashFlow[] {
  return assets.flatMap(asset => {
    if (end <= start || (asset.maturity && asset.maturity <= start)) return []
    const amount = asset.amount * fx[asset.currency]
    const result: CashFlow[] = []
    const interval = 12 / asset.frequency
    const type = paymentType(asset)
    const add = (date: string, payment: number, paymentKind: CashFlow['type']) =>
      result.push({ date, amount: payment, assetId: asset.id, name: asset.name, type: paymentKind })
    const anchor = asset.scheduleStart ?? start
    const calendarMonths = (Number(start.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(start.slice(5, 7)) - Number(anchor.slice(5, 7))
    const firstPeriod = Math.max(1, Math.floor(calendarMonths / interval))
    let previous = addMonths(anchor, (firstPeriod - 1) * interval)
    for (let next = firstPeriod; asset.rate > 0; next++) {
      const scheduled = addMonths(anchor, interval * next)
      if (asset.maturity && asset.maturity < scheduled) {
        if (asset.maturity <= end && asset.maturity > previous && asset.maturity > start) {
          add(asset.maturity, amount * asset.rate / 100 * daysBetween(previous, asset.maturity) / daysBetween(previous, scheduled) / asset.frequency, type)
        }
        break
      }
      if (scheduled > end) break
      if (scheduled > start) add(scheduled, amount * asset.rate / 100 / asset.frequency, type)
      previous = scheduled
    }
    if (asset.maturity && asset.maturity <= end) add(asset.maturity, amount, 'Погашение')
    return result
  }).sort((a, b) => a.date.localeCompare(b.date))
}

export function portfolioSummary(assets: Asset[], fx: FxRates, start: string) {
  const capital = assets.reduce((sum, a) => sum + a.amount * fx[a.currency], 0)
  const reserve = assets.filter(a => a.kind === 'Денежный резерв').reduce((sum, a) => sum + a.amount * fx[a.currency], 0)
  const annual = cashFlows(assets, fx, start, addMonths(start, 12)).filter(flow => flow.type !== 'Погашение').reduce((sum, flow) => sum + flow.amount, 0)
  return { capital, reserve, working: capital - reserve, annual, yield: capital ? annual / capital : 0 }
}

export interface Scenario {
  keyRate: number
  inflation: number
  bondYield: number
  usd: number
  cny: number
  spread: number
}

export const scenarioDefaults: Record<string, Scenario> = {
  Базовый: { keyRate: 0, inflation: 7, bondYield: 0, usd: 0, cny: 0, spread: 0 },
  Оптимистичный: { keyRate: -2, inflation: 5, bondYield: -2, usd: -5, cny: -3, spread: -0.5 },
  Стрессовый: { keyRate: 3, inflation: 12, bondYield: 4, usd: 15, cny: 10, spread: 2 },
}

export function projectScenario(assets: Asset[], fx: FxRates, start: string, months: number, scenario: Scenario, reinvest: boolean, earlyExit: boolean, withdrawal: number) {
  const end = addMonths(start, months)
  const fxForScenario = { ...fx, USD: fx.USD * (1 + scenario.usd / 100), CNY: fx.CNY * (1 + scenario.cny / 100) }
  const total = assets.reduce((sum, asset) => {
    const value = asset.amount * fxForScenario[asset.currency]
    const remaining = asset.maturity ? Math.max(0, daysBetween(start, asset.maturity) / 365) : Infinity
    const floating = asset.kind === 'Накопительные счета'
    const bond = paymentType(asset) === 'Купон'
    const credit = bond && asset.kind !== 'ОФЗ'
    const rate = Math.max(0, asset.rate + (floating ? scenario.keyRate : 0)) / 100
    const duration = Math.min(5, Math.max(0, remaining - months / 12)) / (1 + rate)
    const priceFactor = bond ? Math.max(0, 1 - duration * (scenario.bondYield + (credit ? scenario.spread : 0)) / 100) : 1
    if (earlyExit && asset.kind === 'Вклады' && (!asset.maturity || asset.maturity > end)) return sum + value
    const adjusted = { ...asset, rate: rate * 100 }
    const income = cashFlows([adjusted], fxForScenario, start, end).filter(flow => flow.type !== 'Погашение').reduce((subtotal, flow) => {
      const reinvestYears = Math.max(0, daysBetween(flow.date, end) / 365)
      return subtotal + flow.amount * (reinvest ? (1 + Math.max(0, 0.08 + scenario.keyRate / 100)) ** reinvestYears : 1)
    }, 0)
    return sum + value * priceFactor + income
  }, 0)
  const taken = Math.min(total, Math.max(0, withdrawal))
  const nominal = total - taken
  return { nominal, real: nominal / (1 + scenario.inflation / 100) ** (months / 12), withdrawal: taken }
}
