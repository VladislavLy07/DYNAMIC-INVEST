import assert from 'node:assert/strict'
import test from 'node:test'
import { addMonths, cashFlows, contributionReturn, portfolioSummary, projectScenario, scenarioDefaults } from './engine.ts'
import { validAsset, type Asset, type FxRates } from './model.ts'

const fx: FxRates = { RUB: 1, USD: 100, CNY: 12, EUR: 105 }
const start = '2024-01-31'
const deposit: Asset = { id: 'deposit', name: 'Вклад', issuer: 'Демо', kind: 'Вклады', amount: 120000, cost: 120000, rate: 12, currency: 'RUB', liquidity: 'Средний', risk: 'Низкий', maturity: '2024-04-15', frequency: 12, scheduleStart: start }

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≈ ${expected}`)
}

test('simple interest, tax and inflation use the full investment horizon', () => {
  const result = contributionReturn(100000, .12, 6, 0, .08, .13)
  near(result.gross, 6000)
  near(result.taxAmount, 780)
  near(result.net, 5220)
  near(result.total, 105220)
  near(result.real, 1.0522 / Math.sqrt(1.08) - 1)
})

test('compound interest handles full payment periods and a fractional period', () => {
  near(contributionReturn(100000, .12, 12, 12, 0, 0).total, 112682.503013197)
  near(contributionReturn(100000, .12, 10, 4, 0, 0).total, 100000 * 1.03 ** 3 * 1.01)
  near(contributionReturn(100000, .12, 1, 4, 0, 0).total, 101000)
})

test('calendar clamps month ends in leap years without drifting the schedule', () => {
  assert.equal(addMonths(start, 1), '2024-02-29')
  assert.equal(addMonths(start, 2), '2024-03-31')
  assert.equal(addMonths('2023-01-31', 1), '2023-02-28')
  assert.equal(addMonths('2024-12-31', 2), '2025-02-28')
})

test('calendar stops at maturity, prorates the final coupon and returns principal once', () => {
  const entries = cashFlows([deposit], fx, start, '2024-06-30')
  assert.deepEqual(entries.map(flow => [flow.date, flow.type, flow.amount]), [
    ['2024-02-29', 'Проценты', 1200],
    ['2024-03-31', 'Проценты', 1200],
    ['2024-04-15', 'Проценты', 600],
    ['2024-04-15', 'Погашение', 120000],
  ])
  assert.deepEqual(cashFlows([deposit], fx, '2024-03-01', '2024-06-30'), entries.slice(1))
  assert.deepEqual(cashFlows([deposit], fx, '2024-04-15', '2024-06-30'), [])
  assert.deepEqual(cashFlows([deposit], fx, '2024-01-01', '2024-01-15'), [])
})

test('calendar pays the full coupon on coinciding maturity and handles FX', () => {
  const bond = { ...deposit, kind: 'Юаневые облигации', currency: 'CNY', amount: 1000, maturity: '2024-02-29' } as const
  assert.deepEqual(cashFlows([bond], fx, start, '2024-02-29').map(flow => [flow.type, flow.amount]), [['Купон', 120], ['Погашение', 12000]])
})

test('portfolio excludes redemption from annual income and supports empty positions', () => {
  const reserve = { ...deposit, kind: 'Денежный резерв', id: 'reserve', rate: 0, currency: 'USD', amount: 1000, maturity: '' } as const
  assert.deepEqual(portfolioSummary([deposit, reserve], fx, start), { capital: 220000, reserve: 100000, working: 120000, annual: 3000, yield: 3000 / 220000 })
  assert.equal(portfolioSummary([], fx, start).yield, 0)
})

test('scenarios preserve principal after maturity and handle exit and withdrawal', () => {
  const base = scenarioDefaults.Базовый
  assert.equal(projectScenario([deposit], fx, start, 12, base, false, false, 0).nominal, 123000)
  assert.equal(projectScenario([deposit], fx, start, 1, base, false, true, 0).nominal, 120000)
  assert.equal(projectScenario([deposit], fx, start, 1, base, false, false, 5000).nominal, 116200)
  assert.equal(projectScenario([deposit], fx, start, 1, base, false, false, 1e8).withdrawal, 121200)
  assert.ok(projectScenario([deposit], fx, start, 12, base, true, false, 0).nominal > 123000)
  near(projectScenario([deposit], fx, start, 12, base, false, false, 0).real, 123000 / 1.07)
})

test('rate, yield, spread and currency shocks affect the appropriate assets', () => {
  const corporate = { ...deposit, kind: 'Корпоративные облигации', currency: 'USD', amount: 1000, maturity: '2027-01-31', frequency: 1 } as const
  const base = scenarioDefaults.Базовый
  const compare = (asset: Asset, shocks = base) => projectScenario([asset], fx, start, 12, shocks, false, false, 0).nominal
  assert.ok(compare(corporate, { ...base, bondYield: 2 }) < compare(corporate))
  assert.ok(compare(corporate, { ...base, spread: 2 }) < compare(corporate))
  near(compare(corporate, { ...base, usd: 10 }), compare(corporate) * 1.1)
  const savings = { ...deposit, kind: 'Накопительные счета', maturity: '' } as const
  assert.ok(compare(savings, { ...base, keyRate: 2 }) > compare(savings))
  assert.equal(compare(deposit, { ...base, keyRate: 2 }), compare(deposit))
})

test('asset validation verifies calendar dates and keeps older saved assets readable', () => {
  assert.equal(validAsset(deposit), true)
  assert.equal(validAsset({ ...deposit, scheduleStart: undefined }), true)
  assert.equal(validAsset({ ...deposit, amount: Infinity }), false)
  assert.equal(validAsset({ ...deposit, maturity: '2024-02-31' }), false)
  assert.equal(validAsset({ ...deposit, maturity: start }), false)
  assert.equal(validAsset({ ...deposit, frequency: 3 }), false)
})
