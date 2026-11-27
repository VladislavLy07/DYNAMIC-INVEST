import type { FxRates } from '../finance/model.ts'
import type { ProjectionOptions } from '../finance/ledger.ts'
import type { Portfolio } from '../portfolio/workspace.ts'

export interface ScenarioInput {
  inflation: number
  key: number
  yield: number
  spread: number
  usd: number
  cny: number
  growth: number
  tax: number
  early: boolean
}

export type ScenarioName = 'Базовый' | 'Оптимистичный' | 'Стрессовый' | 'Пользовательский'
export const initialScenarios: Record<ScenarioName, ScenarioInput> = {
  Базовый: { inflation: 6, key: 0, yield: 0, spread: 0, usd: 0, cny: 0, growth: 0, tax: 0, early: false },
  Оптимистичный: { inflation: 4, key: 1, yield: -2, spread: -1, usd: -5, cny: -3, growth: 4, tax: 0, early: false },
  Стрессовый: { inflation: 12, key: -3, yield: 4, spread: 2, usd: 15, cny: 10, growth: -12, tax: 0, early: false },
  Пользовательский: { inflation: 6, key: 0, yield: 0, spread: 0, usd: 0, cny: 0, growth: 0, tax: 0, early: false },
}
export const scenarioNames = Object.keys(initialScenarios) as ScenarioName[]

export function assumptions(s: ScenarioInput, p: Portfolio, fx: FxRates): ProjectionOptions {
  return { inflation: s.inflation, savingsRateShift: s.key, bondYieldShift: s.yield, creditSpreadShift: s.spread, valuationShift: s.growth,
    taxAssumption: s.tax, earlyExit: s.early, reinvestRate: p.reinvest, monthlyContribution: p.contribution, monthlyWithdrawal: p.withdrawal,
    fx: { ...fx, USD: fx.USD * (1 + s.usd / 100), CNY: fx.CNY * (1 + s.cny / 100) } }
}
