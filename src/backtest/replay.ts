import Decimal from 'decimal.js'
import { daysBetween } from '../finance/engine.ts'
import { money } from '../finance/ledger.ts'
import { validDate } from '../finance/model.ts'
import { maximumDrawdown, xirr } from '../finance/returns.ts'
import type { Snapshot } from '../market/snapshot.ts'

export const publicInstruments = { CNY: 'CNY / RUB', USD: 'USD / RUB', EUR: 'EUR / RUB', gold: 'Золото ЦБ', IMOEX: 'Индекс Мосбиржи', RGBI: 'Индекс гособлигаций' }
export interface ReplayQuote { date: string; availableOn: string; value: number }
export type ReplayEvent =
  | { date: string; type: 'buy' | 'sell'; asset: string; quantity: number; price?: number; fee: number }
  | { date: string; type: 'contribution' | 'withdrawal' | 'income' | 'fee' | 'tax'; amount: number }
export interface ReplaySpec {
  version: 1
  capital: number
  holdings: { asset: string; weight: number }[]
  events: ReplayEvent[]
  quotes: Record<string, ReplayQuote[]>
}
const D = Decimal.clone({ precision: 32 })
const allowedAmount = (v: unknown, low = 0) => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= 1e12
const symbol = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_:-]{1,30}$/.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v)

export function validateReplay(input: unknown): ReplaySpec {
  if (!input || typeof input !== 'object') throw new Error('Неверный формат портфеля.')
  const spec = input as ReplaySpec
  if (spec.version !== 1 || !allowedAmount(spec.capital, .01) || !Array.isArray(spec.holdings) || spec.holdings.length > 30 ||
      !spec.holdings.every(item => item && symbol(item.asset) && allowedAmount(item.weight, .000001) && item.weight <= 100) ||
      new Set(spec.holdings.map(item => item.asset)).size !== spec.holdings.length ||
      spec.holdings.reduce((sum, item) => sum.plus(item.weight), new D(0)).greaterThan(100) ||
      !Array.isArray(spec.events) || spec.events.length > 2000 ||
      !spec.quotes || typeof spec.quotes !== 'object' || Array.isArray(spec.quotes) || Object.keys(spec.quotes).length > 30) {
    throw new Error('Проверьте версию, капитал, веса и объём журнала. Сумма весов не должна превышать 100%.')
  }
  for (const [asset, series] of Object.entries(spec.quotes)) {
    if (!symbol(asset) || Object.hasOwn(publicInstruments, asset) || !Array.isArray(series) || !series.length || series.length > 2000 ||
        !series.every(point => point && validDate(point.date) && validDate(point.availableOn) && point.availableOn >= point.date && allowedAmount(point.value, 0.000001)) ||
        new Set(series.map(point => point.date)).size !== series.length) throw new Error('Неверные котировки или даты доступности: ' + asset)
  }
  for (const entry of spec.events) {
    if (!entry || !validDate(entry.date)) throw new Error('Неверная дата операции.')
    if (entry.type === 'buy' || entry.type === 'sell') {
      if (!symbol(entry.asset) || !allowedAmount(entry.quantity, .000001) || !allowedAmount(entry.fee) ||
        (entry.price !== undefined && !allowedAmount(entry.price, .000001))) throw new Error('Неверная цена, количество или комиссия сделки.')
    } else if (!['contribution', 'withdrawal', 'income', 'fee', 'tax'].includes(entry.type) || !('amount' in entry) || !allowedAmount(entry.amount, .01)) {
      throw new Error('Неверный тип или сумма операции.')
    }
  }
  return spec
}

export function readReplay(raw: string) {
  if (new TextEncoder().encode(raw).length > 1_500_000) throw new Error('Максимальный размер файла — 1,5 МБ.')
  return validateReplay(JSON.parse(raw))
}

function publicQuotes(data: Snapshot | undefined, asset: string): ReplayQuote[] {
  if (!Object.hasOwn(publicInstruments, asset)) return []
  const points = data?.sources[asset as keyof typeof publicInstruments]?.series ?? []
  return points.map(point => ({ date: point.date, availableOn: point.date, value: point.value }))
}

export function replayPortfolio(spec: ReplaySpec, start: string, end: string, data?: Snapshot, maxGap = 7) {
  validateReplay(spec)
  if (!validDate(start) || !validDate(end) || start > end || daysBetween(start, end) > 3653 || !Number.isInteger(maxGap) || maxGap < 0 || maxGap > 31) throw new Error('Проверьте даты, допустимый пропуск и горизонт до десяти лет.')
  if (spec.events.some(entry => entry.date < start || entry.date > end)) throw new Error('Журнал содержит операции за пределами периода.')
  const symbols = new Set([...spec.holdings.map(item => item.asset), ...spec.events.flatMap(entry => 'asset' in entry ? [entry.asset] : [])])
  const feeds = new Map([...symbols].map(asset => {
    const publicAsset = Object.hasOwn(publicInstruments, asset)
    const points = (publicAsset ? publicQuotes(data, asset) : spec.quotes[asset] ?? []).slice().sort((a, b) => a.availableOn.localeCompare(b.availableOn))
    return [asset, { points, index: 0, last: undefined as ReplayQuote | undefined, publishedThrough: publicAsset ? data?.collectedAt.slice(0, 10) : undefined, publicAsset }]
  }))
  const quote = (asset: string, day: string) => {
    const feed = feeds.get(asset)
    if (!feed || (feed.publicAsset && (!feed.publishedThrough || day > feed.publishedThrough))) throw new Error(`${asset}: нет исторических данных на ${day}.`)
    while (feed.index < feed.points.length && feed.points[feed.index].availableOn <= day) {
      const point = feed.points[feed.index++]
      if (!feed.last || point.date >= feed.last.date) feed.last = point
    }
    if (!feed.last || daysBetween(feed.last.date, day) > maxGap) throw new Error(`${asset}: котировка на ${day} отсутствует или старше ${maxGap} дн.`)
    return feed.last
  }
  const balances = new Map<string, Decimal>()
  let cash = new D(spec.capital)
  for (const item of spec.holdings) {
    const principal = new D(spec.capital).times(item.weight).div(100)
    balances.set(item.asset, principal.div(quote(item.asset, start).value))
    cash = cash.minus(principal)
  }
  const ordered = spec.events.slice().sort((a, b) => a.date.localeCompare(b.date))
  const flows = [{ date: start, amount: -spec.capital }]
  const entries: { date: string; type: ReplayEvent['type']; asset: string; cashDelta: number; priceDate: string | null }[] = []
  const rows: { date: string; value: number; cash: number; index: number | null }[] = []
  const netAssetValue = (date: string) => {
    let value = new D(cash)
    for (const [asset, size] of balances) if (!size.isZero()) value = value.plus(size.times(quote(asset, date).value))
    return value
  }
  let capitalAfterFlow = new D(spec.capital)
  let factor: Decimal | null = new D(1)
  let cursor = 0
  let contributions = new D(0), withdrawals = new D(0)
  for (let stamp = Date.parse(start); stamp <= Date.parse(end); stamp += 86400000) {
    const date = new Date(stamp).toISOString().slice(0, 10)
    for (; cursor < ordered.length && ordered[cursor].date === date; cursor++) {
      const entry = ordered[cursor]
      let delta: Decimal
      let priceDate: string | null = null
      if ('asset' in entry) {
        const size = new D(entry.quantity).times(entry.type === 'buy' ? 1 : -1)
        const owned = (balances.get(entry.asset) ?? new D(0)).plus(size)
        if (owned.lessThan(-0.000000001)) throw new Error(`${date}: недостаточно инструмента ${entry.asset}.`)
        const tradePrice = entry.price === undefined ? quote(entry.asset, date) : { value: entry.price, date }
        priceDate = tradePrice.date
        delta = size.negated().times(tradePrice.value).minus(entry.fee)
        balances.set(entry.asset, Decimal.max(owned, 0))
      } else {
        delta = new D(money(entry.amount)).times(['withdrawal', 'fee', 'tax'].includes(entry.type) ? -1 : 1)
        if (entry.type === 'contribution' || entry.type === 'withdrawal') {
          const before = netAssetValue(date)
          factor = factor && capitalAfterFlow.greaterThan(0) ? factor.times(before.div(capitalAfterFlow)) : null
          capitalAfterFlow = before.plus(delta)
          flows.push({ date, amount: delta.negated().toNumber() })
          if (entry.type === 'contribution') contributions = contributions.plus(delta)
          else withdrawals = withdrawals.minus(delta)
        }
      }
      delta = new D(money(delta))
      cash = cash.plus(delta)
      if (cash.lessThan(-0.000001)) throw new Error(`${date}: недостаточно денежных средств после операции №${cursor + 1}.`)
      entries.push({ date, type: entry.type, asset: 'asset' in entry ? entry.asset : '', cashDelta: delta.toNumber(), priceDate })
    }
    const value = netAssetValue(date)
    const indexed = factor && capitalAfterFlow.greaterThan(0) ? factor.times(value).div(capitalAfterFlow).toNumber() : null
    rows.push({ date, value: money(value), cash: money(cash), index: indexed })
  }
  const final = rows.at(-1)!
  const profit = money(new D(final.value).minus(spec.capital).minus(contributions).plus(withdrawals))
  const investmentReturn = final.index === null ? null : final.index - 1
  const indexValues = rows.flatMap(row => row.index === null ? [] : [row.index])
  return { rows, entries, final, profit, twr: investmentReturn, drawdown: indexValues.length === rows.length ? maximumDrawdown([1, ...indexValues]) : null,
    xirr: xirr([...flows, { date: end, amount: final.value }]), contributed: money(contributions), withdrawn: money(withdrawals) }
}
