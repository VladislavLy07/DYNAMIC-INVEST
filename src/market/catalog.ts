import type { Kind } from '../finance/model.ts'

export interface ProductVersion {
  productId: string
  versionId: string
  name: string
  kind: Kind
  issuer: string
  publishedAt: string
  observedAt: string
  validFrom: string | null
  validTo: string | null
  retrievedAt: string
  source: string
  archiveUrl: string | null
  completeness: 'partial' | 'complete'
  terms: { rate: number | null; min: number | null; max: number | null; months: number | null; criteria: string }[]
}

export const productVersions: ProductVersion[] = [
  {
    productId: 'psb-strong', versionId: 'psb-strong-2023-11-15', name: 'Сильная ставка', kind: 'Вклады', issuer: 'ПСБ',
    publishedAt: '2023-11-15', observedAt: '2023-11-15', validFrom: null, validTo: null, retrievedAt: '2026-11-27',
    source: 'https://www.psbank.ru/bank/press/news/2023/11/15-02', archiveUrl: null, completeness: 'partial',
    terms: [{ rate: 15, min: 3_000_000, max: null, months: 36, criteria: 'Подтверждённая строка публикации для новых средств от 3 млн ₽.' }],
  },
  {
    productId: 'psb-income', versionId: 'psb-income-2024-10-28', name: 'Мой доход', kind: 'Вклады', issuer: 'ПСБ',
    publishedAt: '2024-10-28', observedAt: '2024-10-28', validFrom: null, validTo: null, retrievedAt: '2026-11-27',
    source: 'https://www.psbank.ru/bank/press/news/2024/10/28-01', archiveUrl: null, completeness: 'partial',
    terms: [ [3, 20], [6, 20.6], [12, 19.5] ].map(([months, rate]) => ({ rate, min: null, max: null, months, criteria: 'Ставка из датированной новости. Диапазон сумм и сегмент требуют проверки.' })),
  },
  {
    productId: 'psb-invest-income', versionId: 'psb-invest-income-2025-12-12', name: 'Инвестиционный доход', kind: 'Вклады', issuer: 'ПСБ',
    publishedAt: '2025-12-12', observedAt: '2025-12-12', validFrom: null, validTo: null, retrievedAt: '2026-11-27',
    source: 'https://www.psbank.ru/bank/press/news/2025/12/12-03', archiveUrl: null, completeness: 'partial',
    terms: [{ rate: 16.6, min: 50000, max: null, months: 3, criteria: 'Обязательное приобретение ПИФов УК ПСБ. Указанный процент относится к депозитной части.' }],
  },
  {
    productId: 'psb-income', versionId: 'psb-income-2026-09-07', name: 'Мой доход', kind: 'Вклады', issuer: 'ПСБ',
    publishedAt: '2026-09-07', observedAt: '2026-09-07', validFrom: null, validTo: null, retrievedAt: '2026-11-27',
    source: 'https://www.psbank.ru/bank/press/news/2026/09/07-02', archiveUrl: null, completeness: 'partial',
    terms: [{ rate: 13.8, min: 50000, max: null, months: 6, criteria: 'Для держателей Orange Premium Club или Club+, оформление в офисе.' }],
  },
  {
    productId: 'psb-strong', versionId: 'psb-strong-2026-09-07', name: 'Сильная ставка', kind: 'Вклады', issuer: 'ПСБ',
    publishedAt: '2026-09-07', observedAt: '2026-09-07', validFrom: null, validTo: null, retrievedAt: '2026-11-27',
    source: 'https://www.psbank.ru/bank/press/news/2026/09/07-02', archiveUrl: null, completeness: 'partial',
    terms: [[3, 13.8], [6, 14.2], [9, 14], [12, 13.9], [18, 11.5], [24, 11.5]].map(([months, rate]) => ({ rate, min: 50000, max: 10_000_000, months, criteria: 'Диапазон размещения из публикации. Новые клиенты или новые средства по критериям банка.' })),
  },
  {
    productId: 'tokeon-PSB25', versionId: 'tokeon-PSB25-2025-07-02', name: 'Банк ПСБ-25 · PSB25', kind: 'ЦФА', issuer: 'ПАО Банк ПСБ',
    publishedAt: '2025-07-02', observedAt: '2025-07-02', validFrom: null, validTo: null, retrievedAt: '2026-11-27',
    source: 'https://tokeon.ru/vypuski/PSB25', archiveUrl: null, completeness: 'partial',
    terms: [{ rate: null, min: null, max: null, months: null, criteria: 'Адресный выпуск. Номинал 100 000 ₽. Дата погашения 02.10.2025. Условия доступны в решении о выпуске.' }],
  },
]

export function selectProductVersions(versions: ProductVersion[], date: string, mode: 'year' | 'asof' | 'current') {
  return versions.filter(v => {
    if (mode === 'year') return v.observedAt.slice(0, 4) === date.slice(0, 4)
    if (v.publishedAt > date || v.observedAt > date) return false
    if (v.validFrom && v.validTo) return v.validFrom <= date && date <= v.validTo
    return mode === 'asof' && v.observedAt === date
  }).sort((a, b) => b.observedAt.localeCompare(a.observedAt) || a.versionId.localeCompare(b.versionId))
}
