import type { Currency, Kind } from '../finance/model.ts'
import type { ProductTerm, ProductVersion } from './catalog.ts'

const issuer = 'ПСБ'
const site = 'https://www.psbank.ru'
const retrievedAt = '2026-11-27'

function publication(id: string, name: string, kind: Kind, date: string, slug: string, terms: ProductTerm[], currency: Currency = 'RUB'): ProductVersion {
  return { productId: id, versionId: id + '-' + date, name, kind, issuer, currency, publishedAt: date, observedAt: date, validFrom: null, validTo: null,
    retrievedAt, source: site + slug, archiveUrl: null, completeness: 'partial', terms }
}

const press = '/bank/press/news/'
const bankTerm = (rate: number | null, min: number | null, max: number | null, months: number | null, criteria: string): ProductTerm =>
  ({ rate, min, max, months, criteria })

export const psbObservations: ProductVersion[] = [
  publication('psb-yuan', 'Вклад в юанях', 'Вклады', '2023-10-05', press + '2023/page7',
    [{ ...bankTerm(null, null, null, null, 'Архивная сводка банка. Опубликована верхняя граница доходности.'), rate: null, rateCeiling: 3.1 }], 'CNY'),
  publication('psb-capital', 'ПСБ Капитал', 'Накопительные счета', '2024-05-31', press + '2024/05/31-02',
    [bankTerm(14, null, null, null, 'Private Banking. Начисление на ежедневный остаток.')]),
  publication('psb-strong', 'Сильная ставка', 'Вклады', '2024-10-28', press + '2024/10/28-01',
    [[3, 21], [6, 21.6], [12, 20.5], [18, 19.5], [24, 19.2]].map(([months, rate]) =>
      bankTerm(rate, months === 6 ? 100_000 : null, null, months, 'Ставка на новые средства. Условия по остальным суммам не раскрыты в публикации.'))),
  publication('psb-narodny', 'Народный вклад', 'Вклады', '2024-11-25', press + '2024/11/25-01',
    [3, 6, 12].map(month => bankTerm(30, 50000, 50000, month, 'Фиксированная сумма размещения. Однократное открытие.'))),
  publication('psb-narodny-plus', 'Народный вклад плюс', 'Вклады', '2024-11-25', press + '2024/11/25-01',
    [3, 6, 12].map(month => bankTerm(30, 10000, 100000, month, 'Для держателей дебетовых карт ПСБ, зарплатных клиентов и получателей пенсии на карту ПСБ.'))),
  publication('psb-narodny-account', 'Народный счёт', 'Накопительные счета', '2025-09-02', press + '2025/09/02-02',
    [bankTerm(25, null, 150000, 2, 'Приветственная ставка в первые два месяца для клиентов, отвечающих условиям банка.')]),
  publication('psb-narodny', 'Народный вклад', 'Вклады', '2026-06-10', press + '2026/06/10-02',
    [[1, 30], [3, 22], [7, 20]].map(([months, rate]) => bankTerm(rate, null, null, months, 'Условия для новых вкладчиков. Для перевода пенсии действовали отдельные ставки.'))),
  publication('psb-impulse', 'Импульс', 'Накопительные счета', '2026-10-27', press + '2026/10/27-01',
    [bankTerm(15, null, 5000000, 2, 'Новые клиенты. Первые два месяца на минимальный остаток.'), bankTerm(9, null, null, null, 'Базовая ставка после приветственного периода по данным публикации.')]),
  publication('psb-vector', 'Вектор', 'Накопительные счета', '2026-10-27', press + '2026/10/27-01',
    [bankTerm(11.5, 3000000, null, null, 'На минимальный остаток строго свыше указанной суммы.'),
      bankTerm(11, 500000, 3000000, null, 'На минимальный остаток.'), bankTerm(10.5, null, 500000, null, 'На минимальный остаток ниже порога.'),
      bankTerm(10.5, 3000000, null, null, 'На ежедневный остаток.')]),
]

const snapshotAt = '2026-11-25'
function snapshot(id: string, name: string, kind: Kind, path: string, terms: ProductTerm[], currency: Currency = 'RUB', validFrom: string | null = null): ProductVersion {
  return {
    ...publication(id, name, kind, snapshotAt, path, terms, currency), validFrom,
    evidence: 'official-product-snapshot',
  }
}

export const psbProductSnapshots: ProductVersion[] = [
  snapshot('psb-vector', 'Вектор', 'Накопительные счета', '/personal/savingsaccount/vektor', [
    bankTerm(13.5, .01, null, null, 'Начисление на минимальный остаток календарного месяца. Ежемесячная капитализация в последний день месяца.'),
    bankTerm(12.5, .01, null, null, 'Начисление на ежедневный остаток. Ежемесячная капитализация в последний день месяца.'),
  ], 'RUB', '2026-11-10'),
  snapshot('psb-strong', 'Сильная ставка', 'Вклады', '/personal/saving', [
    { ...bankTerm(null, 50000, 10000000, null, 'Новые деньги. Диапазон витрины, ставка зависит от параметров договора.'), rateRange: [10.8, 14.5], days: [91, 731] },
  ]),
  snapshot('psb-income', 'Мой доход', 'Вклады', '/personal/saving', [
    { ...bankTerm(null, 50000, null, null, 'Диапазон витрины. Точная ставка определяется параметрами договора.'), rateRange: [12, 14.4] },
  ]),
  snapshot('psb-yuan', 'Вклад в юанях', 'Вклады', '/personal/saving', [
    { ...bankTerm(null, 10000, null, null, 'Диапазон витрины для депозита в китайских юанях.'), rateRange: [2.5, 3.5], days: [91, 731] },
  ], 'CNY'),
]
