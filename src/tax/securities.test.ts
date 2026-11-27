import assert from 'node:assert/strict'
import test from 'node:test'
import { russianDividendTax, securitiesTax, type PassiveTaxInput } from './securities.ts'
import type { Snapshot } from '../market/snapshot.ts'

const base: PassiveTaxInput = { year: 2025, resident: true, events: [], compatibleLoss: 0, otherBase: 0, withholding: 0 }
const sell: PassiveTaxInput['events'][number] = {
  kind: 'sale', proceeds: { date: '2025-07-02', amount: 6_501_026, currency: 'RUB' }, basis: { date: '2024-04-03', amount: 4_001_026, currency: 'RUB' }, expensesRub: 0,
}

test('applies 13/15 marginal securities rates and separates withholding', () => {
  const result = securitiesTax({ ...base, events: [sell], withholding: 10_000 })
  assert.equal(result.taxable, 2_500_000)
  assert.equal(result.tax, 327_000)
  assert.equal(result.payable, 317_000)
})

test('nets compatible current losses and uses only confirmed prior offset', () => {
  const loss = { ...sell, proceeds: { ...sell.proceeds, amount: 3_901_026 } }
  const result = securitiesTax({ ...base, events: [sell, loss], compatibleLoss: 100_000, otherBase: 200_000 })
  assert.equal(result.financialResult, 2_400_000)
  assert.equal(result.offset, 100_000)
  assert.equal(result.tax, 301_000)
  assert.equal(securitiesTax({ ...base, events: [loss], compatibleLoss: 1e6 }).retainedLoss, 100_000)
})

test('uses separate FX dates without fallback and rejects future observations', () => {
  const sale = { ...sell, proceeds: { ...sell.proceeds, amount: 100, currency: 'USD' as const }, basis: { date: '2025-04-03', amount: 100, currency: 'USD' as const } }
  const stamp = '2025-07-03T00:00:00.000Z'
  const data: Snapshot = { version: 1, collectedAt: stamp, sources: { USD: { source: 'https://www.cbr.ru/', status: 'ok', lastSuccess: stamp, lastAttempt: stamp, changes: 0, errors: [],
    series: [{ date: '2025-04-03', value: 90 }, { date: '2025-07-01', value: 100 }, { date: '2025-07-03', value: 120 }] } } }
  assert.equal(securitiesTax({ ...base, events: [sale] }, data).tax, 130)
  assert.match(securitiesTax({ ...base, events: [sale] }).error!, /нет проверенного курса/)
  assert.match(securitiesTax({ ...base, events: [{ ...sale, proceeds: { ...sale.proceeds, date: '2024-07-01' } }] }, data).error!, /налоговый год/)
})

test('domestic dividends use their own marginal base and withheld tax', () => {
  assert.deepEqual(russianDividendTax(2026, 2_500_000, 310_000), { tax: 327_000, payable: 17_000, net: 2_173_000 })
  assert.equal(russianDividendTax(2024, 2_500_000, 0), null)
})
