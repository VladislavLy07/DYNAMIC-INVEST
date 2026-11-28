import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bankProjection, bankScenarios, type BankParameters } from './bankSlides.ts'
import { latestBankObservations, productVersions } from '../market/catalog.ts'

const input: BankParameters = {
  amount: 1_000_000, date: '2026-01-01', months: 12, allowanceUsed: false,
  assumedAllowance: 160_000, otherBase: 0, qualifies: false,
}

test('the two tax allowance modes reproduce the control example', () => {
  const free = bankProjection(input, 13.5, 'maturity')!
  const spent = bankProjection({ ...input, allowanceUsed: true }, 13.5, 'maturity')!
  assert.deepEqual([free.gross, free.tax, free.net, free.netReturn], [135000, 0, 135000, .135])
  assert.deepEqual([spent.gross, spent.tax, spent.net, spent.netReturn], [135000, 17550, 117450, .11745])
})

test('uses the actual tax rule by payment year and separates monthly payments', () => {
  const outcome = bankProjection({ ...input, date: '2024-12-31' }, 20, 'maturity')!
  assert.deepEqual(outcome.years, [{ year: 2025, gross: 200000, allowance: 210000, tax: 0 }])
  const split = bankProjection({ ...input, date: '2025-06-15' }, 12, 'monthly')!
  assert.deepEqual(split.years.map(row => [row.year, row.allowance]), [[2025, 210000], [2026, 160000]])
  assert.equal(bankProjection({ ...input, date: '2026-12-15', months: 6 }, 12, 'capitalized')?.years[0].year, 2026)
})

test('bank terms do not infer exact rates from a range or apply a qualified rate without confirmation', () => {
  const rows = latestBankObservations(productVersions, '2026-11-28')
  const vector = rows.find(item => item.productId === 'psb-vector')!
  const depositRange = rows.find(item => item.productId === 'psb-strong')!
  assert.equal(bankScenarios(depositRange, input).result, null)
  const projection = bankScenarios(vector, input)
  assert.equal(projection.result, projection.base)
  assert.ok(projection.qualified!.net! > projection.base!.net!)
  assert.deepEqual(bankScenarios(vector, { ...input, qualifies: true }).result, projection.qualified)
  assert.equal(bankScenarios(rows.find(item => item.productId === 'psb-yuan')!, input).result, null)
})
