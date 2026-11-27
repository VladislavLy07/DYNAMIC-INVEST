import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fundPeriodReturn, fundScenario, instrumentScenario, type SlideInput } from './miniSlides.ts'
import { fundDisclosures } from '../market/fundDisclosures.ts'

const base: SlideInput = { amount: 1_000_000, months: 12, model: 'resident', otherBase: 0 }

test('funds tax gain without the deposit-interest allowance; 8/12/18% at 13%', () => {
  const scenarios = [.08, .12, .18].map(rate => fundScenario(base, rate)!)
  assert.deepEqual(scenarios.map(row => [row.netReturn, row.grossProfit, row.netProfit, row.tax]), [
    [.0696, 80_000, 69_600, 10_400], [.1044, 120_000, 104_400, 15_600], [.1566, 180_000, 156_600, 23_400],
  ])
})

test('fund gains cross the combined 2.4m threshold and losses trigger no tax', () => {
  const result = fundScenario({ ...base, otherBase: 2_350_000 }, .12)!
  assert.equal(result.tax, 17_000)
  assert.equal(result.netValue, 1_103_000)
  assert.equal(fundScenario(base, -.12)?.netValue, 880_000)
  assert.equal(fundScenario(base, -.12)?.tax, 0)
})

test('fund scenarios compound by horizon and continue to accrue tax after three years', () => {
  assert.equal(fundPeriodReturn(.21, 6), .1)
  assert.equal(fundScenario({ ...base, months: 24 }, .1)?.grossValue, 1_210_000)
  assert.equal(fundScenario({ ...base, months: 36 }, .1)?.tax, 43_030)
  const result = fundScenario({ ...base, months: 60 }, .1)!
  assert.equal(result.grossAnnual, .1)
  assert.equal(result.grossProfit, 610_510)
  assert.ok(result.netAnnual! < result.grossAnnual)
  assert.equal(fundScenario({ ...base, model: 'gross' }, .1)?.tax, null)
  assert.equal(fundScenario({ ...base, model: 'flat13' }, .1)?.tax, 13_000)
  assert.equal(fundScenario({ ...base, amount: 1.111 }, .1), null)
})

test('deposit uses exact ACT/365 days including leap year; savings capitalizes monthly', () => {
  const deposit = instrumentScenario(base, 'deposit', .12, '2024-01-01', 21)!
  assert.equal(deposit.grossProfit, 120_328.77)
  assert.equal(deposit.tax, 0)
  const savings = instrumentScenario({ ...base, months: 6 }, 'savings', .12, '2026-01-01', 21)!
  assert.equal(savings.grossProfit, 61_001.57)
})

test('bond uses nominal and unreinvested coupons; gold incurs one sale spread; DFA uses maturity payment', () => {
  const bond = instrumentScenario({ ...base, months: 24 }, 'bond', .1, '2026-01-01', 21)!
  assert.equal(bond.grossValue, 1_200_000)
  assert.equal(bond.tax, 26_000)
  assert.equal(instrumentScenario(base, 'gold', .1, '2026-01-01', 21)?.grossValue, 1_078_000)
  assert.equal(instrumentScenario(base, 'dfa', .1, '2026-01-01', 21)?.grossProfit, 100_000)
  assert.equal(instrumentScenario(base, 'dfa', .1, '2026-01-01', 21)?.tax, null)
})

test('official fund snapshot has 12 open and 4 exchange products with unique rule IDs', () => {
  assert.deepEqual(fundDisclosures.slice(0, 3).map(fund => fund.name), ['Финансовая подушка', 'Оборонный', 'Просто. Облигации'])
  assert.equal(fundDisclosures.filter(fund => !fund.ticker).length, 12)
  assert.equal(fundDisclosures.filter(fund => fund.ticker).length, 4)
  assert.equal(new Set(fundDisclosures.map(fund => fund.id)).size, 16)
  assert.ok(fundDisclosures.every(fund => fund.url.startsWith('https://www.upravlyaem.ru/funds/') &&
    fund.kid.startsWith('https://www.upravlyaem.ru/upload/') && fund.kidDate <= fund.published &&
    fund.holdings.every(row => row.name && row.share >= 0 && row.share <= 100)))
  assert.equal(fundDisclosures[0].holdings[0].share, 35.74)
  assert.equal(fundDisclosures[0].history[12], 15.45)
  assert.equal(fundDisclosures[2].annualFee, 1.94)
})
