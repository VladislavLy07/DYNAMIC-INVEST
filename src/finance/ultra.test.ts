import assert from 'node:assert/strict'
import test from 'node:test'
import { eventTotals, projectLedger, type FinancialEvent } from './ledger.ts'
import { accruedCoupon, bondMetrics, cagr, discountedValue, goal, periodicNpv, termLadder, timeWeightedReturn, xirr } from './returns.ts'
import { depositTax } from '../tax/deposits.ts'
import { allocation, available, decodeWorkspace, migratePortfolio, replacePortfolio } from '../portfolio/workspace.ts'
import { businessCase } from '../features/business.ts'
import { decodePositions, positionColumns } from '../portfolio/csv.ts'
import { csv, eventsCsv, eventsIcs } from '../reporting/files.ts'
import type { Asset, FxRates } from './model.ts'

const fx: FxRates = { RUB: 1, USD: 100, EUR: 110, CNY: 12 }
const start = '2023-12-31'
const position: Asset = { id: 'x', name: 'Вклад', issuer: 'Банк', currency: 'RUB', liquidity: 'Средний', risk: 'Низкий',
  kind: 'Вклады', amount: 366000, cost: 366000, rate: 10, frequency: 12, scheduleStart: start, maturity: '2024-12-31', contract: { accrual: 'daily' } }
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`)

test('daily balance in a leap year, ten positions and repayment preserve capital', () => {
  const portfolio = Array.from({ length: 10 }, (_, i) => ({ ...position, id: String(i) }))
  const result = projectLedger(portfolio, fx, start, 12)
  assert.equal(result.opening, 3660000)
  assert.equal(result.totals.principal, 3660000)
  assert.equal(result.totals.paid, 366000)
  assert.equal(result.totals.gross, 366000)
  assert.equal(result.final.value, 4026000)
  assert.equal(result.final.net, result.totals.net)
})

test('minimum balance reacts differently from daily interest after a withdrawal', () => {
  const a: Asset = { ...position, kind: 'Накопительные счета', maturity: '', contract: { accrual: 'daily', movements: [{ date: '2024-01-16', amount: -183000 }] } }
  const b = { ...a, contract: { ...a.contract, accrual: 'minimum' as const } }
  const daily = projectLedger([a], fx, start, 1)
  const minimum = projectLedger([b], fx, start, 1)
  assert.equal(daily.totals.paid, 2300)
  assert.equal(minimum.totals.paid, 1550)
  assert.equal(daily.totals.withdrawn, 0)
  assert.equal(daily.final.value, a.amount + 2300)
})

test('a new rate changes subsequent days and capitalization increases principal once', () => {
  const rateChange = { date: '2024-01-16', rate: 20 }
  const result = projectLedger([{ ...position, maturity: '2024-01-31', contract: { accrual: 'daily', capitalization: true, rateChanges: [rateChange] } }], fx, start, 1)
  assert.equal(result.totals.paid, 4700)
  assert.equal(result.totals.principal, 370700)
  assert.equal(result.totals.cashFlow, 370700)
  assert.equal(result.final.value, 370700)
})

test('month-end anchors still issue payments when calculation starts on a payment date', () => {
  const result = projectLedger([{ ...position, scheduleStart: '2025-01-31', maturity: '', contract: { accrual: 'daily' } }], fx, '2025-02-28', 2)
  assert.equal(result.events.find(e => e.type === 'income')?.date, '2025-03-31')
})

test('early settlement restores specified rate and renewal avoids fictitious withdrawal', () => {
  const early = projectLedger([{ ...position, contract: { accrual: 'daily', earlyRate: 0 } }], fx, start, 2, 0, { earlyExit: true })
  assert.equal(early.totals.gross, 0)
  assert.equal(early.totals.principal, position.amount)
  const renewed = projectLedger([{ ...position, maturity: '2024-01-31', contract: { accrual: 'daily', renewalRate: 5 } }], fx, start, 3)
  assert.equal(renewed.totals.principal, 0)
  assert.ok(renewed.totals.paid > 3100)
  assert.ok(renewed.totals.paid < 6500)
})

test('fund and gold growth are valuation without cash and support negative returns', () => {
  const a: Asset = { ...position, id: 'f', kind: 'ПИФы', amount: 100000, contract: undefined, maturity: '', rate: -10 }
  const b: Asset = { ...a, id: 'g', kind: 'Золото', rate: 10 }
  const result = projectLedger([a, b], fx, '2023-01-01', 12)
  assert.equal(result.totals.gross, 0)
  assert.equal(result.totals.paid, 0)
  assert.equal(result.final.value, 200000)
  assert.ok(result.events.some(e => e.type === 'valuation' && e.amount < 0))
})

test('amortization, coupons and CFA principal use explicit schedules', () => {
  const a: Asset = { ...position, kind: 'Корпоративные облигации', amount: 980, cost: 980, contract: { principal: 1000, schedule: [{ date: '2024-01-31', principal: 500, income: 40 }, { date: '2024-02-29', principal: 500, income: 30 }] } }
  const b: Asset = { ...a, id: 'cfa', kind: 'ЦФА', amount: 1000 }
  const result = projectLedger([a, b], fx, start, 12)
  assert.equal(result.totals.principal, 2000)
  assert.equal(result.totals.paid, 140)
  assert.equal(result.totals.valuation, 20)
  assert.equal(result.final.value, 2140)
})

test('FX, assessment and tax settlement have separate meanings', () => {
  const a: Asset = { ...position, kind: 'Валюты', amount: 100, currency: 'USD', maturity: '', contract: undefined }
  const result = projectLedger([a], fx, start, 12, 0, { fx: { ...fx, USD: 110 }, taxAssumption: 10 })
  assert.equal(result.totals.valuation, 1000)
  assert.equal(result.totals.assessed, 100)
  assert.equal(result.final.value, 10900)
  assert.equal(eventTotals([...result.events, { ...result.events.at(-1)!, type: 'tax' }]).net, 900)
})

test('external contributions, withdrawals, fees and reinvestment reconcile with the chart', () => {
  const p = { ...position, contract: { ...position.contract, annualFee: 1.2 } }
  const result = projectLedger([p], fx, start, 6, 100000, { monthlyContribution: 1000, monthlyWithdrawal: 2000, reinvestRate: 8, inflation: 3 })
  assert.equal(result.totals.contribution, 6000)
  assert.equal(result.totals.withdrawn, 12000)
  assert.equal(result.totals.fees, 2196)
  assert.ok(result.events.some(e => e.type === 'reinvestment'))
  assert.ok(result.final.real < result.final.value)
  near(result.final.value, result.opening + result.totals.net + result.totals.contribution - result.totals.withdrawn)
})

test('XIRR, CAGR, present value, YTM, duration, accrued coupon and ambiguity', () => {
  const cash = [{ date: '2023-01-01', amount: -100 }, { date: '2024-01-01', amount: 110 }]
  const irr = xirr(cash)
  assert.equal(irr.status, 'ok')
  if (irr.status === 'ok') near(irr.rate, .1)
  near(discountedValue(cash, cash[0].date, .1), 0)
  near(cagr(100, 110, 365)!, .1)
  const bond = bondMetrics(100, cash[0].date, cash.slice(1))!
  near(bond.ytm, .1)
  near(bond.duration, 1)
  near(bond.modifiedDuration, 1 / 1.1)
  near(accruedCoupon(100, '2024-01-01', '2024-01-31', '2024-01-16')!, 50)
  assert.equal(xirr([...cash, { date: '2025-01-01', amount: -10 }]).status, 'ambiguous')
})

test('tax limits apply across banks once and thresholds change in 2025', () => {
  const ordinary = depositTax(2023, Array(10).fill(20000), 0, 0, 'resident')!
  assert.equal(ordinary.exemption, 150000)
  assert.equal(ordinary.tax, 6500)
  assert.equal(depositTax(2024, [200000], 0, 0, 'resident')!.tax, 0)
  assert.equal(depositTax(2025, [400000], 20000, 2350000, 'resident')!.tax, 30500)
  assert.equal(depositTax(2026, [200000], 0, 0, 'resident'), null)
  assert.equal(depositTax(2026, [200000], 0, 0, 'resident', 16)!.tax, 5200)
  assert.equal(depositTax(2025, [300000], 0, 0, 'nonresident')!.tax, 13500)
})

test('capital goal handles zero yield and ladder allocates every kopeck', () => {
  assert.equal(goal(1000, 2200, 12, 0, 0).monthly, 100)
  const ladder = termLadder(100, '2024-01-31', [1, 3, 6], .12)
  near(ladder.reduce((a, b) => a + b.principal, 0), 100)
  assert.equal(ladder[0].maturity, '2024-02-29')
})

test('migration, JSON restoration and allocation limits preserve contractual terms', () => {
  const legacy = migratePortfolio([position])
  const restored = decodeWorkspace(JSON.stringify(legacy))
  assert.deepEqual(restored, legacy)
  assert.equal(allocation(restored.portfolios[0].assets), 366000)
  assert.equal(available(restored.portfolios[0]), 0)
  assert.throws(() => replacePortfolio(restored, { ...restored.portfolios[0], budget: 100 }), /лимит/)
  assert.throws(() => decodeWorkspace('[' + ' '.repeat(1e6) + ']'), /превышает/)
})

test('CSV escapes formula cells and iCalendar keeps line breaks in text', () => {
  const event: FinancialEvent = { amount: 10, rubles: 10, currency: 'RUB', date: '2024-01-31', instrument: '1', name: '=SUM(1,2)\nX-TEST:TRUE', type: 'income', status: 'forecast', source: 'тест' }
  assert.match(eventsCsv([event]), /"'=SUM/)
  assert.match(eventsIcs([event], new Date('2024-01-01')), /DTSTART;VALUE=DATE:20240131/)
  assert.doesNotMatch(eventsIcs([event]), /\r\nX-TEST/)
})


test('CSV position import uses explicit columns, unique IDs and core validation', () => {
  const row = ['Мой портфель', 'Вклад "Новый"', 'Вклады', 'Банк', 'RUB', 100000, 100000, 12, '2025-12-12']
  const [asset] = decodePositions(csv([positionColumns, row]), () => 'id')
  assert.equal(asset.name, row[1])
  assert.equal(asset.rate, 12)
  assert.throws(() => decodePositions(csv([positionColumns, row.map((item, i) => i === 5 ? 'NaN' : item)])), /строке/)
})

test('periodic NPV and TWR validate reinvested growth across subperiods', () => {
  near(periodicNpv(.1, [-100, 110]), 0)
  near(timeWeightedReturn([{ opening: 100, closingBeforeFlow: 110 }, { opening: 210, closingBeforeFlow: 231 }])!, .21)
  assert.equal(timeWeightedReturn([{ opening: 0, closingBeforeFlow: 231 }]), null)
})

test('business case traces funnel, net new money and remuneration scenarios', () => {
  const result = businessCase({ contacts: 100, conversion: [50, 50, 40, 50], averageTicket: 100_000, outflows: 100_000, initialAum: 1_000_000,
    managementRate: 10, fixedCosts: 20_000, acquisitionCost: 100, salary: 30_000, variableShare: 15 })
  assert.deepEqual(result.funnel, [100, 50, 25, 10, 5])
  assert.equal(result.nnm, 400_000)
  assert.equal(result.commission, 120_000)
  assert.equal(result.payout[1].businessNet, 42_000)
})
