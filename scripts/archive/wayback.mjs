const reference = 'https://archive.org/wayback/available'

export function waybackUrl(original, date) {
  return reference + '?' + new URLSearchParams({ url: original, timestamp: date.replaceAll('-', '') + '235959' })
}

export function waybackObservation(text, original, cutoff) {
  const entry = JSON.parse(text).archived_snapshots?.closest
  if (!entry?.available || entry.status !== '200') return null
  const time = entry.timestamp
  if (typeof time !== 'string' || !/^\d{14}$/.test(time)) throw new Error('Некорректная дата снимка')
  const date = `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}`
  if (date > cutoff) return null
  const url = new URL(entry.url)
  if (url.hostname !== 'web.archive.org' || url.username || url.password || url.port || !url.pathname.startsWith('/web/' + time + '/')) throw new Error('Неожиданный URL архивного снимка')
  if (new URL(url.pathname.slice(20)).origin !== new URL(original).origin) throw new Error('Архивная запись относится к другому источнику')
  url.protocol = 'https:'
  return { original, archiveUrl: url.href, archivedAt: date, status: 'archive-observation' }
}
