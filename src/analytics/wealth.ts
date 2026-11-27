import { available, type Portfolio } from '../portfolio/workspace.ts'
import type { FxRates } from '../finance/model.ts'
import type { projectLedger } from '../finance/ledger.ts'

type Projection = ReturnType<typeof projectLedger>

export function typesForPortfolio(portfolio: Portfolio, fx: FxRates) {
  const values = new Map<string, number>()
  for (const a of portfolio.assets) values.set(a.kind, (values.get(a.kind) ?? 0) + a.amount * fx[a.currency])
  const free = available(portfolio)
  if (free > 0) values.set('Свободный капитал', free)
  return [...values.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
}

export function wealthMetrics(portfolio: Portfolio, fx: FxRates, projection: Projection, annual: Projection, months: number) {
  const free = available(portfolio)
  const reserve = portfolio.assets.filter(a => a.kind === 'Денежный резерв').reduce((sum, a) => sum + a.amount * fx[a.currency], free)
  const unrealized = portfolio.assets.reduce((sum, a) => sum + (a.amount - a.cost) * fx[a.currency], 0)
  const external = projection.totals.contribution || projection.totals.withdrawn
  return {
    free, reserve, unrealized, capital: projection.opening, working: projection.opening - reserve,
    monthlyPaid: annual.totals.paid / 12,
    annualYield: annual.opening > 0 ? annual.totals.gross / annual.opening : null,
    realYield: projection.opening > 0 && !external && months > 0 ? projection.final.real / projection.opening - 1 : null,
  }
}

export type WealthMetrics = ReturnType<typeof wealthMetrics>

export function concentration(portfolio: Portfolio, fx: FxRates) {
  const levels = new Map<string, number>()
  const currency = new Map<string, number>()
  const liquidity = new Map<string, number>()
  for (const a of portfolio.assets) {
    const value = a.amount * fx[a.currency]
    levels.set(a.issuer, (levels.get(a.issuer) ?? 0) + value)
    currency.set(a.currency, (currency.get(a.currency) ?? 0) + value)
    liquidity.set(a.liquidity, (liquidity.get(a.liquidity) ?? 0) + value)
  }
  const ordered = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1])
  return { issuers: ordered(levels), currency: ordered(currency), liquidity: ordered(liquidity) }
}
