import { validDate } from '../finance/model.ts'

export interface ArchiveRecord {
  source: 'Wayback Machine' | 'Common Crawl'
  original: string
  year: number
  status: 'archive-observation' | 'no-snapshot' | 'unavailable'
  archiveUrl?: string
  archivedAt?: string
  observations?: number
  error?: string
}

function safeLink(value: unknown, host: string) {
  try {
    if (typeof value !== 'string') return false
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === host && !url.port && !url.username && !url.password
  } catch { return false }
}

export function decodeArchives(input: unknown) {
  if (!input || typeof input !== 'object' || !('checkedAt' in input) || typeof input.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(input.checkedAt)) || !('rows' in input) || !Array.isArray(input.rows) || input.rows.length > 60) throw new Error('Неизвестный формат архива')
  const rows: ArchiveRecord[] = input.rows
  if (!rows.every(row => row && ['Wayback Machine', 'Common Crawl'].includes(row.source) &&
    ['archive-observation', 'no-snapshot', 'unavailable'].includes(row.status) &&
    Number.isInteger(row.year) && row.year >= 2023 && row.year <= 2100 &&
    safeLink(row.original, 'www.psbank.ru') && (row.archiveUrl === undefined || safeLink(row.archiveUrl, 'web.archive.org')) &&
    (row.archivedAt === undefined || validDate(row.archivedAt)) &&
    (row.error === undefined || typeof row.error === 'string' && row.error.length <= 150))) throw new Error('Архивные записи не прошли проверку')
  return { checkedAt: input.checkedAt, rows }
}

export async function fetchArchives() {
  const response = await fetch(import.meta.env.BASE_URL + 'data/history/archives.json', { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error('Архив недоступен')
  const payload = await response.text()
  if (payload.length > 30_000) throw new Error('Большой архивный ответ')
  return decodeArchives(JSON.parse(payload))
}
