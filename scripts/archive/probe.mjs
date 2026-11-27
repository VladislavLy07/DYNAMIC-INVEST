import { writeFile } from 'node:fs/promises'
import { readLimited } from '../adapters/collect.mjs'
import { waybackObservation, waybackUrl } from './wayback.mjs'
import { indexRecords, indexUrl } from './common-crawl.mjs'

const targets = [
  'https://www.psbank.ru/personal/saving',
  'https://www.psbank.ru/personal/saving/vklady-s-popolneniem',
]
const cutoff = new Date().toISOString().slice(0, 10)
const date = new Date().toISOString()
const rows = []
for (const original of targets) {
  for (const year of [2023, 2024, 2025, 2026]) {
    const last = year === Number(cutoff.slice(0, 4)) ? cutoff : `${year}-12-31`
    try {
      const observation = waybackObservation(await readLimited(waybackUrl(original, last), 20000), original, last)
      rows.push({ source: 'Wayback Machine', year, original, ...observation, status: observation ? 'archive-observation' : 'no-snapshot' })
    } catch (error) {
      rows.push({ source: 'Wayback Machine', year, original, status: 'unavailable', error: String(error.message).slice(0, 150) })
    }
  }
  try {
    const matches = indexRecords(await readLimited(indexUrl('CC-MAIN-2025-51', original), 50000), original, cutoff)
    rows.push({ source: 'Common Crawl', original, year: 2025, status: matches.length ? 'archive-observation' : 'no-snapshot', observations: matches.length })
  } catch (error) {
    rows.push({ source: 'Common Crawl', original, year: 2025, status: 'unavailable', error: String(error.message).slice(0, 150) })
  }
}
await writeFile('public/data/history/archives.json', JSON.stringify({ checkedAt: date, rows }, null, 2) + '\n')
console.info(rows.map(row => [row.source, row.year, row.status, row.error ?? row.archivedAt ?? ''].join(' ')).join('\n'))
