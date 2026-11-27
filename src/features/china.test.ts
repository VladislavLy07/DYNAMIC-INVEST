import assert from 'node:assert/strict'
import test from 'node:test'
import { compareDeposits } from './china.ts'

test('RUB/CNY comparison reflects two FX conversions and break-even price', () => {
  const base = { capital: 120000, days: 365, rubRate: 10, cnyRate: 3, entryFx: 12, exitShift: 0, spread: 0, rubInterestTax: 0, cnyInterestTax: 0 }
  const result = compareDeposits(base)!
  assert.equal(result.cnyFinal, 10300)
  assert.equal(result.rubFinal, 132000)
  assert.equal(result.difference, -8400)
  const shift = (result.breakEvenFx / base.entryFx - 1) * 100
  assert.equal(compareDeposits({ ...base, exitShift: shift })!.difference, 0)
  assert.ok(compareDeposits({ ...base, spread: 1 })!.difference < result.difference)
  assert.equal(compareDeposits({ ...base, entryFx: 0 }), null)
})
