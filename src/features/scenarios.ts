import type { FxRates } from '../finance/model.ts'
import type { ProjectionOptions, YearProjection } from '../finance/ledger.ts'
import type { Portfolio } from '../portfolio/workspace.ts'

export interface ScenarioParameters {
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

export type ScenarioYear = Omit<ScenarioParameters, 'early'>
export interface ScenarioInput extends ScenarioParameters { annual?: Record<string, ScenarioYear> }


export type ScenarioName = 'Базовый' | 'Оптимистичный' | 'Стрессовый' | 'Пользовательский'
export const initialScenarios: Record<ScenarioName, ScenarioInput> = {
  Базовый: { inflation: 6, key: 0, yield: 0, spread: 0, usd: 0, cny: 0, growth: 0, tax: 0, early: false },
  Оптимистичный: { inflation: 4, key: 1, yield: -2, spread: -1, usd: -5, cny: -3, growth: 4, tax: 0, early: false },
  Стрессовый: { inflation: 12, key: -3, yield: 4, spread: 2, usd: 15, cny: 10, growth: -12, tax: 0, early: false },
  Пользовательский: { inflation: 6, key: 0, yield: 0, spread: 0, usd: 0, cny: 0, growth: 0, tax: 0, early: false },
}
export const scenarioNames = Object.keys(initialScenarios) as ScenarioName[]

export const scenarioFields = [
  ['inflation', 'Инфляция, %', -10, 50], ['key', 'Сдвиг ставки счетов, п.п.', -20, 20],
  ['yield', 'Доходность облигаций, п.п.', -5, 5], ['spread', 'Кредитный спред, п.п.', -5, 20],
  ['usd', 'USD/RUB, %', -70, 100], ['cny', 'CNY/RUB, %', -70, 100],
  ['growth', 'Изменение роста цен, п.п.', -70, 50], ['tax', 'Условный налог, %', 0, 50],
] as const

export function readAnnual(value: unknown): ScenarioInput['annual'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const rows = Object.entries(value).slice(0, 31).filter(([year, item]) => /^20\d{2}$/.test(year) && item &&
    scenarioFields.every(([key, , min, max]) => typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= min && item[key] <= max))
  return Object.fromEntries(rows.map(([year, item]) => [year, Object.fromEntries(scenarioFields.map(([key]) => [key, item[key]])) as ScenarioYear]))
}

export function assumptions(s: ScenarioInput, p: Portfolio, fx: FxRates): ProjectionOptions {
  const scaledFx = (year: ScenarioYear) => ({ ...fx, USD: fx.USD * (1 + year.usd / 100), CNY: fx.CNY * (1 + year.cny / 100) })
  const years = new Map<number, YearProjection>(Object.entries(s.annual ?? {}).map(([year, v]) => [Number(year), {
    year: Number(year), inflation: v.inflation, savingsRateShift: v.key, valuationShift: v.growth,
    bondYieldShift: v.yield, creditSpreadShift: v.spread, taxAssumption: v.tax, fx: scaledFx(v),
  }]))
  return { years, inflation: s.inflation, savingsRateShift: s.key, bondYieldShift: s.yield, creditSpreadShift: s.spread, valuationShift: s.growth,
    taxAssumption: s.tax, earlyExit: s.early, reinvestRate: p.reinvest, monthlyContribution: p.contribution, monthlyWithdrawal: p.withdrawal,
    fx: scaledFx(s) }
}
