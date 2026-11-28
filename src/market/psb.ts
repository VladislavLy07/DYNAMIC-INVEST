import type { Currency, Kind } from '../finance/model.ts'
import type { ProductTerm, ProductVersion } from './catalog.ts'

const issuer = 'ПСБ'
const site = 'https://www.psbank.ru'
const retrievedAt = '2026-11-28'

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
  publication('psb-income', 'Мой доход', 'Вклады', '2023-11-15', press + '2023/11/15-02',
    [bankTerm(13.5, null, null, 6, 'Базовое условие из новости ПСБ.'),
      bankTerm(12.5, null, null, 12, 'Базовое условие из новости ПСБ.')]),
  publication('psb-benefit', 'Моя выгода', 'Вклады', '2023-11-15', press + '2023/11/15-02',
    [{ ...bankTerm(null, null, null, null, 'Архивная верхняя граница. Депозиты этой линейки предлагались на срок от 6 месяцев до 2 лет.'), rateCeiling: 13 }]),
  publication('psb-moneybox', 'Моя копилка', 'Вклады', '2023-11-15', press + '2023/11/15-02',
    [{ ...bankTerm(null, null, null, null, 'Архивное предложение с пополнением.'), rateCeiling: 10.6 }]),
  publication('psb-opportunities', 'Мои возможности', 'Вклады', '2023-11-15', press + '2023/11/15-02',
    [{ ...bankTerm(null, null, null, null, 'Архивное предложение с пополнением и частичным снятием.'), rateCeiling: 9.6 }]),
  publication('psb-accent', 'Акцент на процент', 'Накопительные счета', '2023-11-15', press + '2023/11/15-02',
    [bankTerm(9, null, null, null, 'Базовая ставка по датированной публикации.')]),
  publication('psb-spare', 'Про запас', 'Накопительные счета', '2023-11-15', press + '2023/11/15-02',
    [bankTerm(9, null, null, null, 'Базовая ставка по датированной публикации.')]),
  publication('psb-unlimited', 'Безлимитный', 'Накопительные счета', '2023-11-15', press + '2023/11/15-02',
    [bankTerm(12, 5000, null, null, 'Архивное условие по сумме.')]),
  publication('psb-victory', 'Вклад в Победу', 'Вклады', '2026-09-07', press + '2026/09/07-02',
    [{ ...bankTerm(null, 50000, 10000000, 6, 'Доходность из новости банка для указанного срока и диапазона сумм.'), rateCeiling: 14.3 }]),
  publication('psb-capital', 'ПСБ Капитал', 'Накопительные счета', '2024-05-31', press + '2024/05/31-02',
    [bankTerm(14, null, null, null, 'Private Banking. Начисление на ежедневный остаток.')]),
  publication('psb-strong', 'Сильная ставка', 'Вклады', '2024-10-28', press + '2024/10/28-01',
    [[3, 21], [6, 21.6], [12, 20.5], [18, 19.5], [24, 19.2]].map(([months, rate]) =>
      ({ ...bankTerm(rate, months === 6 ? 100_000 : null, null, months, 'Ставка на новые средства. Условия по остальным суммам не раскрыты в публикации.'), qualified: true }))),
  publication('psb-narodny', 'Народный вклад', 'Вклады', '2024-11-25', press + '2024/11/25-01',
    [3, 6, 12].map(month => bankTerm(30, 50000, 50000, month, 'Фиксированная сумма размещения. Однократное открытие.'))),
  publication('psb-narodny-plus', 'Народный вклад плюс', 'Вклады', '2024-11-25', press + '2024/11/25-01',
    [3, 6, 12].map(month => ({ ...bankTerm(30, 10000, 100000, month, 'Для держателей дебетовых карт ПСБ, зарплатных клиентов и получателей пенсии на карту ПСБ.'), qualified: true }))),
  publication('psb-narodny-account', 'Народный счёт', 'Накопительные счета', '2025-09-02', press + '2025/09/02-02',
    [bankTerm(25, null, 150000, 2, 'Приветственная ставка в первые два месяца для клиентов, отвечающих условиям банка.')]),
  publication('psb-narodny', 'Народный вклад', 'Вклады', '2026-06-10', press + '2026/06/10-02',
    [[1, 30], [3, 22], [7, 20]].map(([months, rate]) => bankTerm(rate, null, null, months, 'Условия для новых вкладчиков. Для перевода пенсии действовали отдельные ставки.'))),
  publication('psb-impulse', 'Импульс', 'Накопительные счета', '2026-10-27', press + '2026/10/27-01',
    [{ ...bankTerm(15, null, 5000000, 2, 'Новые клиенты. Первые два месяца на минимальный остаток.'), promotion: true }, bankTerm(9, null, null, null, 'Базовая ставка после приветственного периода по данным публикации.')]),
  publication('psb-vector', 'Вектор', 'Накопительные счета', '2026-10-27', press + '2026/10/27-01',
    [bankTerm(11.5, 3000000, null, null, 'На минимальный остаток строго свыше указанной суммы.'),
      bankTerm(11, 500000, 3000000, null, 'На минимальный остаток.'), bankTerm(10.5, null, 500000, null, 'На минимальный остаток ниже порога.'),
      bankTerm(10.5, 3000000, null, null, 'На ежедневный остаток.')]),
]

const snapshotAt = '2026-11-25'
function snapshot(id: string, name: string, kind: Kind, path: string, terms: ProductTerm[], currency: Currency = 'RUB', validFrom: string | null = null): ProductVersion {
  return {
    ...publication(id, name, kind, snapshotAt, path, terms, currency), validFrom,
    bankPayment: id === 'psb-vector' ? 'capitalized' : undefined,
    evidence: 'official-product-snapshot',
  }
}

export const psbProductSnapshots: ProductVersion[] = [
  snapshot('psb-vector', 'Вектор', 'Накопительные счета', '/personal/savingsaccount/vektor', [
    { ...bankTerm(13.5, .01, null, null, 'Начисление на минимальный остаток календарного месяца. Ежемесячная капитализация в последний день месяца.'), qualified: true },
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

const indexCheckDate = '2026-11-28'
function indexed(id: string, name: string, kind: Kind, path: string, terms: ProductTerm[]): ProductVersion {
  return { ...publication(id, name, kind, indexCheckDate, path, terms), evidence: 'official-index', storefront: 'indexed-offer' }
}

const savings = '/personal/savingsaccount'
export const psbIndexedObservations: ProductVersion[] = [
  indexed('psb-impulse', 'Импульс', 'Накопительные счета', savings, [
    bankTerm(16, null, null, 2, 'Приветственная ставка для новых клиентов. Уточните лимит остатка и порядок начисления.'),
    bankTerm(9, null, null, null, 'Базовая ставка из витрины.'),
  ]),
  indexed('psb-accent', 'Акцент на процент', 'Накопительные счета', savings + '/accentpercent', [
    { ...bankTerm(null, null, null, null, 'На ежедневный остаток. Доход зависит от объёма покупок по карте и применимых условий.'), rateCeiling: 14 },
  ]),
  ...([
    ['psb-spare', 'Про запас', '27.10.2026'],
    ['psb-keeper', 'Хранитель', '27.10.2026'],
    ['psb-atlant', 'Атлант', '11.11.2025'],
    ['psb-narodny-account', 'Народный счёт', '17.10.2025'],
    ['psb-unlimited', 'Безлимитный', '12.03.2025'],
    ['psb-samolet', 'Копим с Самолётом', '01.10.2024'],
  ] as const).map(([id, name, before]) => ({ ...indexed(id, name, 'Накопительные счета', savings, [
    bankTerm(null, null, null, null, `Условия обслуживания счетов, открытых до ${before}.`),
  ]), storefront: 'archived' as const })),
  indexed('psb-future', 'Ставка на будущее', 'Вклады', '/personal/saving/stavka-na-budushchee', [
    { ...bankTerm(null, 30000, null, null, 'Вклад для участников программы долгосрочных сбережений НПФ ПСБ. Сверьте редакцию условий.'), rateRange: [15, 28], days: [32, 367], qualified: true },
  ]),
  indexed('psb-moneybox', 'Моя копилка', 'Вклады', '/personal/saving/mymoneybox', [
    { ...bankTerm(null, 50000, null, null, 'Пополнение и ежемесячные проценты.'), rateRange: [11, 11.99], days: [91, 367] },
  ]),
]

const deposits = '/personal/saving'
export const psbAdditionalStorefront: ProductVersion[] = [
  indexed('psb-victory', 'Вклад в Победу', 'Вклады', deposits + '/vklad-v-pobedu', [
    { ...bankTerm(null, 300000, null, null, 'Условия благотворительной акции из витрины, открытие онлайн до 14 декабря 2026.'), rateRange: [13.3, 14.3], termDays: [91, 181, 367] },
  ]),
  indexed('psb-narodny', 'Народный вклад', 'Вклады', deposits, [
    { ...bankTerm(null, 10000, 150000, null, 'Доходность онлайн-предложения из витрины.'), rateRange: [16, 20], termDays: [32, 91, 122] },
  ]),
  { ...indexed('psb-stable', 'Стабильный доход', 'Вклады', deposits + '/stabilnyi-dokhod', [
    { ...bankTerm(null, 50000, null, null, 'Регулярные выплаты на отдельный счёт.'), rateRange: [10.5, 14], days: [181, 731] },
  ]), bankPayment: 'monthly' },
  indexed('psb-metal', 'Драгоценный', 'Вклады', deposits, [
    { ...bankTerm(null, 50000, null, null, 'Специальные условия для покупателей драгоценных металлов.'), rateRange: [14.7, 15.8], days: [91, 367], qualified: true },
  ]),
  indexed('psb-opportunities', 'Мои возможности', 'Вклады', deposits, [
    { ...bankTerm(null, 50000, null, null, 'Пополнение и частичное снятие по правилам вклада.'), rateRange: [10, 11.46], days: [91, 367] },
  ]),
  indexed('psb-social', 'Социальный вклад', 'Вклады', '/articles/socialnyj-vklad-i-socialnyj-schet', [
    { ...bankTerm(28, .01, 50000, null, 'Витрина указывает ставку для получателей государственной социальной поддержки.'), fixedDays: 365, qualified: true },
  ]),
]
