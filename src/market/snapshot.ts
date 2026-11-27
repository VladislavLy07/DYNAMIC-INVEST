import { validDate, type Currency, type FxRates } from '../finance/model.ts'

export const indicators = {
  key: { title: 'Ключевая ставка', unit: '% годовых' },
  inflation: { title: 'Инфляция', unit: '% г/г' },
  USD: { title: 'USD / RUB', unit: '₽ за 1 USD' },
  EUR: { title: 'EUR / RUB', unit: '₽ за 1 EUR' },
  CNY: { title: 'CNY / RUB', unit: '₽ за 1 CNY' },
  gold: { title: 'Золото', unit: '₽ за грамм' },
  IMOEX: { title: 'Индекс Мосбиржи', unit: 'пунктов' },
  RGBI: { title: 'Индекс гособлигаций', unit: 'пунктов' },
}
export type Indicator = keyof typeof indicators
export interface Observation { date: string; value: number }
export interface Series {
  source: string
  status: 'ok' | 'review' | 'unavailable'
  lastSuccess: string | null
  lastAttempt: string
  series: Observation[]
  changes: number
  errors: { date: string; message: string }[]
}
export interface Snapshot { version: 1; collectedAt: string; sources: Partial<Record<Indicator, Series>> }

const allowedHosts = new Set(['www.cbr.ru', 'www.moex.com', 'iss.moex.com'])
export function supportedSource(value: unknown): value is string {
  try {
    if (typeof value !== 'string') return false
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedHosts.has(url.hostname)
  } catch { return false }
}
const instant = (s: unknown): s is string => typeof s === 'string' && Number.isFinite(Date.parse(s)) && s === new Date(s).toISOString()

export function decodeSnapshot(input: unknown): Snapshot {
  if (!input || typeof input !== 'object') throw new Error('Пустой снимок данных.')
  const snapshot = input as Snapshot
  if (snapshot.version !== 1 || !instant(snapshot.collectedAt) || !snapshot.sources || typeof snapshot.sources !== 'object') throw new Error('Неизвестный формат снимка.')
  const sources: Snapshot['sources'] = {}
  for (const id of Object.keys(indicators) as Indicator[]) {
    const s = snapshot.sources[id]
    if (!s) continue
    if (!supportedSource(s.source) || !['ok', 'review', 'unavailable'].includes(s.status) ||
      !instant(s.lastAttempt) || (s.lastSuccess !== null && !instant(s.lastSuccess)) ||
      !Number.isInteger(s.changes) || s.changes < 0 || !Array.isArray(s.errors) || s.errors.length > 10 ||
      !s.errors.every(e => e && instant(e.date) && typeof e.message === 'string' && e.message.length <= 180) ||
      !Array.isArray(s.series) || s.series.length > 20_000 ||
      !s.series.every((p, i) => p && validDate(p.date) && Number.isFinite(p.value) && (i === 0 || s.series[i - 1].date < p.date))) throw new Error('Повреждён ряд ' + id)
    sources[id] = s
  }
  return { version: 1, collectedAt: snapshot.collectedAt, sources }
}

export function availableAt(series: Series | undefined, date: string, monthlyReleaseLag = false) {
  if (!series) return undefined
  const eligibleDate = monthlyReleaseLag ? new Date(Date.parse(date) - 31 * 86400000).toISOString().slice(0, 10) : date
  let low = 0, high = series.series.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (series.series[mid].date <= eligibleDate) low = mid + 1
    else high = mid
  }
  return series.series[low - 1]
}

export function snapshotFx(snapshot: Snapshot | undefined, date: string, fallback: FxRates) {
  const fx = { ...fallback }
  const missing: Currency[] = []
  for (const code of ['USD', 'EUR', 'CNY'] as const) {
    const observation = availableAt(snapshot?.sources[code], date)
    if (observation && Date.parse(date) - Date.parse(observation.date) <= 7 * 86400000) fx[code] = observation.value
    else missing.push(code)
  }
  return { fx, missing }
}

export async function loadSnapshot() {
  const response = await fetch(import.meta.env.BASE_URL + 'data/market/snapshot.json', { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error('Снимок данных недоступен.')
  const raw = await response.text()
  if (raw.length > 3_000_000) throw new Error('Снимок превышает допустимый размер.')
  return decodeSnapshot(JSON.parse(raw))
}
