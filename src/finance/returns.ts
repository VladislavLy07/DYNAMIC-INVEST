import { daysBetween, addMonths } from './engine.ts'
import { validDate } from './model.ts'

export interface DatedCash { date: string; amount: number }

export function discountedValue(flows: DatedCash[], date: string, rate: number) {
  if (!(rate > -1)) return NaN
  return flows.reduce((sum, item) => sum + item.amount / (1 + rate) ** (daysBetween(date, item.date) / 365), 0)
}

// A chronological sign change is required. Mixed external flows can have multiple roots.
export function xirr(flows: DatedCash[]) {
  if (!flows.every(flow => validDate(flow.date) && Number.isFinite(flow.amount))) return { status: 'unavailable' } as const
  const totals = new Map<string, number>()
  for (const f of flows) totals.set(f.date, (totals.get(f.date) ?? 0) + f.amount)
  const ordered = [...totals].filter(([, amount]) => amount !== 0).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))
  const changes = ordered.slice(1).filter((f, index) => Math.sign(f.amount) !== Math.sign(ordered[index].amount)).length
  if (changes > 1) return { status: 'ambiguous' } as const
  if (changes === 0) return { status: 'unavailable' } as const
  const date = ordered[0].date
  let low = -.999999, high = 1
  const at = (rate: number) => discountedValue(ordered, date, rate)
  const lowSign = Math.sign(at(low))
  while (Math.sign(at(high)) === lowSign && high < 1e6) high = high * 2 + 1
  if (Math.sign(at(high)) === lowSign) return { status: 'unavailable' } as const
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    if (Math.sign(at(mid)) === lowSign) low = mid
    else high = mid
  }
  return { status: 'ok', rate: (high + low) / 2 } as const
}

export function cagr(start: number, end: number, days: number) {
  return start > 0 && end >= 0 && days > 0 ? (end / start) ** (365 / days) - 1 : null
}

export function maximumDrawdown(points: number[]) {
  let peak = 0
  let drawdown = 0
  for (const point of points) {
    peak = Math.max(peak, point)
    if (peak > 0) drawdown = Math.max(drawdown, (peak - point) / peak)
  }
  return peak > 0 ? drawdown : null
}

export function bondMetrics(price: number, settlement: string, paymentSchedule: DatedCash[]) {
  const payments = paymentSchedule.filter(row => row.date > settlement)
  if (!payments.length || !Number.isFinite(price) || price <= 0 || payments.some(row => row.amount < 0)) return null
  const result = xirr([{ date: settlement, amount: -price }, ...payments])
  if (result.status !== 'ok') return null
  const duration = payments.reduce((sum, row) => {
    const years = daysBetween(settlement, row.date) / 365
    return sum + years * row.amount / (1 + result.rate) ** years
  }, 0) / price
  return { ytm: result.rate, duration, modifiedDuration: duration / (1 + result.rate) }
}

export function accruedCoupon(coupon: number, previous: string, next: string, settlement: string) {
  const period = daysBetween(previous, next)
  return period > 0 && settlement >= previous && settlement < next ? coupon * daysBetween(previous, settlement) / period : null
}

export function goal(initial: number, target: number, months: number, annualRate: number, inflation: number) {
  const r = (1 + annualRate) ** (1 / 12) - 1
  const nominalTarget = target * (1 + inflation) ** (months / 12)
  const growth = (1 + r) ** months
  const factor = r === 0 ? months : Math.expm1(months * Math.log1p(r)) / r
  return { monthly: Math.max(0, (nominalTarget - initial * growth) / factor), initialNeeded: nominalTarget / growth, nominalTarget }
}

export function termLadder(total: number, start: string, terms: number[], rate: number) {
  const cents = Math.round(total * 100)
  const unit = Math.floor(cents / terms.length)
  return terms.map((months, i) => {
    const principal = (i === terms.length - 1 ? cents - unit * i : unit) / 100
    const maturity = addMonths(start, months)
    return { months, principal, maturity, income: Math.round(principal * rate * daysBetween(start, maturity) / 365 * 100) / 100 }
  })
}


export function periodicNpv(rate: number, cash: number[]) {
  return rate > -1 ? cash.reduce((sum, value, period) => sum + value / (1 + rate) ** period, 0) : NaN
}

export function timeWeightedReturn(periods: { opening: number; closingBeforeFlow: number }[]) {
  if (!periods.length || !periods.every(p => Number.isFinite(p.opening) && p.opening > 0 && Number.isFinite(p.closingBeforeFlow) && p.closingBeforeFlow >= 0)) return null
  return periods.reduce((growth, p) => growth * p.closingBeforeFlow / p.opening, 1) - 1
}
