import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cbrAdapters } from './cbr.mjs'
import { moexAdapters } from './moex.mjs'

export async function readLimited(url, maxBytes = 3_000_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error', headers: { 'User-Agent': 'Dynamic-Invest-Research/5.0' } })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
  const reader = response.body.getReader()
  let bytes = 0
  const decoder = new TextDecoder(response.headers.get('content-type')?.includes('1251') || url.includes('XML_dynamic') ? 'windows-1251' : 'utf-8')
  let result = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.length
      if (bytes > maxBytes) throw new Error('Источник превысил лимит ответа')
      result += decoder.decode(value, { stream: true })
    }
    return result + decoder.decode()
  } finally { await reader.cancel() }
}

export async function refresh(adapter, previous, retrievedAt, read = readLimited) {
  const base = previous ?? { series: [], lastSuccess: null, errors: [], changes: 0 }
  try {
    const fresh = adapter.parse(await read(adapter.url))
    const combined = new Map(base.series.map(p => [p.date, p]))
    let changes = 0
    for (const point of fresh) {
      const old = combined.get(point.date)
      if (point.date > retrievedAt.slice(0, 10)) throw new Error('Источник вернул наблюдение из будущего')
      if (old && Math.abs(point.value - old.value) > 0.0001) throw new Error(`Пересмотр наблюдения ${point.date}, требуется ручная проверка`)
      if (!old) { combined.set(point.date, point); changes++ }
    }
    return { source: adapter.source, status: 'ok', lastAttempt: retrievedAt, lastSuccess: retrievedAt, changes,
      series: [...combined.values()].sort((a, b) => a.date.localeCompare(b.date)),
      errors: base.errors }
  } catch (error) {
    const message = String(error.message).slice(0, 180)
    const status = message.includes('ручная проверка') ? 'review' : 'unavailable'
    return { ...base, source: adapter.source, lastAttempt: retrievedAt, status, changes: 0, errors: [...base.errors, { date: retrievedAt, message }].slice(-10) }
  }
}

function mergeSeed(published, seed) {
  const combined = {}
  if (published?.version !== 1) return seed
  for (const [id, value] of Object.entries(published.sources ?? {})) {
    if (!value || !Array.isArray(value.series) || value.series.length > 20_000 || !Array.isArray(value.errors) || !value.series.every(p => typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value))) continue
    if (!seed.sources[id] || (value.lastSuccess ?? '') >= (seed.sources[id].lastSuccess ?? '')) combined[id] = value
  }
  return { ...seed, collectedAt: published.collectedAt ?? seed.collectedAt, sources: { ...seed.sources, ...combined } }
}

async function main() {
  const output = resolve(process.argv[2] ?? 'public/data/market/snapshot.json')
  let before = { version: 1, collectedAt: null, sources: {} }
  try { before = JSON.parse(await readFile(output, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (process.argv.includes('--published')) {
    try { before = mergeSeed(JSON.parse(await readLimited('https://vladislavly07.github.io/DYNAMIC-INVEST/data/market/snapshot.json')), before) }
    catch (error) { console.info('Опубликованный снимок недоступен. Используется проверенный снимок сборки.', error.message) }
  }
  const collectedAt = new Date().toISOString()
  const today = collectedAt.slice(0, 10)
  const sources = {}
  // Sequential calls to CBR avoid a burst against one host.
  for (const adapter of [...cbrAdapters('2022-12-01', today), ...moexAdapters(today)]) {
    sources[adapter.id] = await refresh(adapter, before.sources[adapter.id], collectedAt)
    console.info(adapter.id, sources[adapter.id].status, sources[adapter.id].series.length, sources[adapter.id].errors.at(-1)?.message ?? '')
  }
  const changed = Object.entries(sources).some(([id, source]) => source.changes || source.status !== before.sources[id]?.status)
  const heartbeat = !before.collectedAt || before.collectedAt.slice(0, 10) !== today
  await writeFile(output + '.tmp', JSON.stringify({ version: 1, collectedAt, sources }) + '\n')
  await rename(output + '.tmp', output)
  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import('node:fs/promises')
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${Boolean(changed || heartbeat)}\n`)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main()
