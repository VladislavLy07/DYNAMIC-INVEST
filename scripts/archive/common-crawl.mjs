import { gunzipSync } from 'node:zlib'

export function indexUrl(collection, original) {
  if (!/^CC-MAIN-20\d{2}-\d{2}$/.test(collection)) throw new Error('Недопустимая коллекция Common Crawl')
  return `https://index.commoncrawl.org/${collection}-index?` + new URLSearchParams({ url: original, output: 'json', filter: 'status:200', pageSize: '1' })
}

export function indexRecords(text, original, cutoff) {
  return text.split('\n').filter(Boolean).map(line => {
    const record = JSON.parse(line)
    const { url, timestamp, filename } = record
    const offset = Number(record.offset), length = Number(record.length)
    if (url !== original || typeof timestamp !== 'string' || !/^\d{14}$/.test(timestamp) || typeof filename !== 'string' ||
      !/^crawl-data\/CC-MAIN-20\d{2}-\d{2}\/segments\/[\d.]+\/warc\/[\w.-]+\.warc\.gz$/.test(filename) ||
      !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length <= 0 || length > 250_000) return null
    const date = timestamp.slice(0, 4) + '-' + timestamp.slice(4, 6) + '-' + timestamp.slice(6, 8)
    if (date > cutoff) return null
    return { original: url, archivedAt: date, offset, length, filename, status: 'archive-observation' }
  }).filter(Boolean)
}

export async function readWarcRecord(record) {
  const last = record.offset + record.length - 1
  const response = await fetch('https://data.commoncrawl.org/' + record.filename, {
    headers: { Range: `bytes=${record.offset}-${last}` },
    signal: AbortSignal.timeout(8000), redirect: 'error',
  })
  const range = response.headers.get('content-range')
  if (response.status !== 206 || !range?.startsWith(`bytes ${record.offset}-${last}/`) ||
    Number(response.headers.get('content-length')) !== record.length) {
    await response.body?.cancel()
    throw new Error('Сервер не подтвердил диапазон записи WARC')
  }
  const bytes = new Uint8Array(record.length)
  let written = 0
  for await (const chunk of response.body) {
    if (written + chunk.length > bytes.length) throw new Error('Размер ответа больше длины диапазона')
    bytes.set(chunk, written)
    written += chunk.length
  }
  if (written !== bytes.length) throw new Error('Диапазон прочитан не полностью')
  return gunzipSync(bytes, { maxOutputLength: 1_000_000 })
}
