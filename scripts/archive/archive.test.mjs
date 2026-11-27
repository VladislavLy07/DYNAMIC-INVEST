import assert from 'node:assert/strict'
import test from 'node:test'
import { waybackObservation } from './wayback.mjs'
import { indexRecords, indexUrl } from './common-crawl.mjs'

test('Wayback metadata never establishes terms before the capture date', () => {
  const original = 'https://www.psbank.ru/personal/saving'
  const json = JSON.stringify({ archived_snapshots: { closest: { available: true, status: '200', timestamp: '20250119123205', url: 'http://web.archive.org/web/20250119123205/' + original } } })
  assert.equal(waybackObservation(json, original, '2024-12-31'), null)
  assert.equal(waybackObservation(json, original, '2025-02-01')?.archivedAt, '2025-01-19')
  assert.throws(() => waybackObservation(json.replace('web.archive.org', 'other.example'), original, '2025-02-01'), /Неожиданный/)
})

test('Common Crawl accepts only bounded records for the exact requested URL', () => {
  const original = 'https://www.psbank.ru/personal/saving'
  const sample = { url: original, timestamp: '20250313121212', filename: 'crawl-data/CC-MAIN-2025-12/segments/1000.10/warc/a.warc.gz', offset: '500', length: '2000' }
  assert.equal(indexRecords(JSON.stringify(sample), original, '2025-12-31')[0]?.archivedAt, '2025-03-13')
  assert.equal(indexRecords(JSON.stringify({ ...sample, length: '3000000' }), original, '2025-12-31').length, 0)
  assert.equal(indexRecords(JSON.stringify(sample), original, '2024-12-31').length, 0)
  assert.throws(() => indexUrl('https://other.example', original), /Недопустимая/)
})
