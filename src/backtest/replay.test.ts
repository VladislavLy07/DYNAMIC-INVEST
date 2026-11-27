import assert from 'node:assert/strict'
import test from 'node:test'
import { replayPortfolio, type ReplaySpec } from './replay.ts'

const at = (date: string, value: number, availableOn = date) => ({ date, availableOn, value })
const spec: ReplaySpec = { version: 1, capital: 1000, holdings: [{ asset: 'STOCK', weight: 100 }], events: [],
  quotes: { STOCK: [at('2025-01-01', 10), at('2025-01-02', 11), at('2025-01-03', 12)] } }

test('valuations and cash flows reconcile in multi-asset replay', () => {
  const data: ReplaySpec = {
    ...spec, holdings: [{ asset: 'STOCK', weight: 60 }, { asset: 'OTHER', weight: 30 }],
    quotes: { ...spec.quotes, OTHER: [at('2025-01-01', 30), at('2025-01-03', 25)] },
    events: [{ date: '2025-01-02', type: 'contribution', amount: 100 }, { date: '2025-01-02', type: 'buy', asset: 'STOCK', quantity: 10, fee: 2 },
      { date: '2025-01-03', type: 'sell', asset: 'OTHER', quantity: 2, fee: 1 },
      { date: '2025-01-03', type: 'income', amount: 10 }, { date: '2025-01-03', type: 'tax', amount: 3 }, { date: '2025-01-03', type: 'withdrawal', amount: 20 }],
  }
  const result = replayPortfolio(data, '2025-01-01', '2025-01-03')
  assert.deepEqual(result.rows.map(row => row.value), [1000, 1158, 1164])
  assert.equal(result.profit, 84)
  assert.ok(Math.abs(result.twr! - (1.06 * 1184 / 1160 - 1)) < 1e-10)
  assert.equal(result.entries[1].cashDelta, -112)
})

test('does not use quotes before publication or indefinitely carry prices', () => {
  const delayed = { ...spec, quotes: { STOCK: [at('2025-01-01', 10, '2025-01-02')] } }
  assert.throws(() => replayPortfolio(delayed, '2025-01-01', '2025-01-03'), /котировка/)
  assert.throws(() => replayPortfolio(spec, '2025-01-01', '2025-01-20'), /старше/)
  assert.throws(() => replayPortfolio({ ...spec, quotes: { USD: spec.quotes.STOCK } }, '2025-01-01', '2025-01-03'), /Неверные котировки/)
})

test('rejects leveraged weights, distributions beyond cash and short positions', () => {
  assert.throws(() => replayPortfolio({ ...spec, holdings: [{ asset: 'STOCK', weight: 105 }] }, '2025-01-01', '2025-01-03'), /весов/)
  assert.throws(() => replayPortfolio({ ...spec, events: [{ date: '2025-01-02', type: 'withdrawal', amount: 20 }] }, '2025-01-01', '2025-01-03'), /недостаточно денежных/)
  assert.throws(() => replayPortfolio({ ...spec, events: [{ date: '2025-01-03', type: 'sell', asset: 'STOCK', quantity: 110, fee: 0 }] }, '2025-01-01', '2025-01-03'), /недостаточно инструмента/)
})
