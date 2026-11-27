import assert from 'node:assert/strict'
import test from 'node:test'
import { availableAt, decodeSnapshot, supportedSource } from './snapshot.ts'
import { productVersions, selectProductVersions } from './catalog.ts'

test('product records distinguish observations, effective periods and dates', () => {
  assert.equal(selectProductVersions(productVersions, '2024-12-31', 'asof').length, 0)
  assert.equal(selectProductVersions(productVersions, '2024-12-31', 'year').length, 5)
  assert.equal(selectProductVersions(productVersions, '2024-10-28', 'asof').some(row => row.name === 'Мой доход'), true)
  assert.equal(selectProductVersions(productVersions, '2026-11-27', 'current').length, 4)
  assert.equal(selectProductVersions(productVersions, '2026-12-03', 'current').length, 0)
  assert.equal(selectProductVersions(productVersions, '2026-11-24', 'asof').some(row => row.evidence), false)
  assert.equal(selectProductVersions(productVersions, '2026-11-25', 'asof').filter(row => row.evidence).length, 4)
  const valid = [ { ...productVersions[0], validFrom: '2026-06-01', validTo: '2026-06-30', publishedAt: '2026-06-01', observedAt: '2026-06-01' } ]
  assert.equal(selectProductVersions(valid, '2026-05-31', 'asof').length, 0)
  assert.equal(selectProductVersions(valid, '2026-06-30', 'current').length, 1)
})

test('market lookups require valid ordered snapshots and never use future observations', () => {
  const stamp = '2024-04-05T10:00:00.000Z'
  const points = [{ date: '2024-01-01', value: 13 }, { date: '2024-04-02', value: 14 }]
  const key = { source: 'https://www.cbr.ru/', status: 'ok', lastAttempt: stamp, lastSuccess: stamp, errors: [], changes: 2, series: points }
  const snapshot = decodeSnapshot({ version: 1, collectedAt: stamp, sources: { key } })
  assert.equal(availableAt(snapshot.sources.key, '2024-04-01')?.value, 13)
  assert.equal(availableAt(snapshot.sources.key, '2023-12-31'), undefined)
  assert.throws(() => decodeSnapshot({ version: 1, collectedAt: stamp, sources: { key: { ...key, series: [...points].reverse() } } }), /Повреждён/)
  assert.equal(supportedSource('https://www.cbr.ru.attacker.example/'), false)
})
