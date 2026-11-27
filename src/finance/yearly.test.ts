import assert from 'node:assert/strict'
import test from 'node:test'
import { projectLedger, type YearProjection } from './ledger.ts'
import { readAnnual } from '../features/scenarios.ts'
import type { Asset, FxRates } from './model.ts'

const fx: FxRates = { RUB: 1, USD: 90, CNY: 12, EUR: 100 }
const asset: Asset = { id: 'a', name: 'a', kind: 'Накопительные счета', issuer: 'a', currency: 'RUB', amount: 36500, cost: 36500,
  rate: 10, maturity: '', frequency: 12, liquidity: 'Средний', risk: 'Низкий', contract: { accrual: 'daily' } }
const year = (value: number, changes: Partial<YearProjection> = {}): YearProjection => ({ year: value, inflation: 0, savingsRateShift: 0, valuationShift: 0, bondYieldShift: 0, creditSpreadShift: 0, taxAssumption: 0, fx, ...changes })

test('applies daily rates across the calendar boundary and preserves fixed deposits', () => {
  const years = new Map([[2026, year(2026, { savingsRateShift: 10 })]])
  const start = '2025-12-15'
  const result = projectLedger([asset], fx, start, 1, 0, { years })
  assert.equal(result.totals.paid, 460)
  assert.equal(projectLedger([{ ...asset, kind: 'Вклады' }], fx, start, 1, 0, { years }).totals.paid, 310)
})

test('revalues only outstanding FX principal and applies the settlement-year currency', () => {
  const years = new Map([[2026, year(2026, { fx: { ...fx, CNY: 15 } })]])
  const bond: Asset = { ...asset, kind: 'Юаневые облигации', currency: 'CNY', maturity: '2025-12-20', amount: 1000, contract: { principal: 1000, schedule: [{ date: '2025-12-20', income: 25, principal: 1000 }] } }
  const first = projectLedger([bond], fx, '2025-12-01', 2, 0, { years })
  assert.equal(first.totals.valuation, 0)
  assert.equal(first.final.value, 12300)
  const longer = { ...bond, maturity: '2026-01-20', contract: { principal: 1000, schedule: [{ date: '2026-01-20', income: 25, principal: 1000 }] } }
  const second = projectLedger([longer], fx, '2025-12-01', 2, 0, { years })
  assert.equal(second.totals.valuation, 3000)
  assert.equal(second.final.value, 15375)
})

test('compounds year-specific inflation and validates historical local settings', () => {
  const years = new Map([[2026, year(2026, { inflation: 20 })], [2027, year(2027, { inflation: 50 })]])
  assert.equal(projectLedger([], fx, '2026-01-01', 24, 180000, { years }).final.real, 100000)
  assert.deepEqual(readAnnual({ 2026: { inflation: 500 } }), {})
  assert.equal(readAnnual(undefined), undefined)
})
