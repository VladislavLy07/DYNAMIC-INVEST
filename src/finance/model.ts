export const kinds = ['Вклады', 'Накопительные счета', 'ОФЗ', 'Корпоративные облигации', 'Акции', 'ПИФы', 'ЦФА', 'Золото', 'Валюты', 'Юаневые облигации', 'Денежный резерв'] as const
export const currencies = ['RUB', 'USD', 'CNY', 'EUR'] as const
export const levels = ['Низкий', 'Средний', 'Высокий'] as const
export type Kind = typeof kinds[number]
export type Currency = typeof currencies[number]
export type Level = typeof levels[number]

export interface Asset {
  id: string
  name: string
  kind: Kind
  issuer: string
  amount: number
  cost: number
  rate: number
  currency: Currency
  liquidity: Level
  risk: Level
  maturity: string
  scheduleStart?: string
  frequency: 1 | 2 | 4 | 12
}

export interface CashFlow {
  date: string
  assetId: string
  name: string
  type: 'Проценты' | 'Купон' | 'Дивиденды' | 'Выплата ЦФА' | 'Погашение'
  amount: number
}

export type FxRates = Record<Currency, number>
export const horizons = [3, 6, 12, 24, 36, 60, 120] as const

export function validAsset(value: unknown): value is Asset {
  if (!value || typeof value !== 'object') return false
  const a = value as Asset
  return typeof a.id === 'string' && a.id.length > 0 &&
    typeof a.name === 'string' && a.name.trim().length > 0 &&
    typeof a.issuer === 'string' && a.issuer.trim().length > 0 &&
    kinds.includes(a.kind) && currencies.includes(a.currency) &&
    levels.includes(a.liquidity) && levels.includes(a.risk) &&
    Number.isFinite(a.amount) && a.amount > 0 && a.amount <= 1e12 &&
    Number.isFinite(a.cost) && a.cost > 0 && a.cost <= 1e12 &&
    Number.isFinite(a.rate) && a.rate >= 0 && a.rate <= 100 &&
    (a.maturity === '' || validDate(a.maturity)) &&
    (a.scheduleStart === undefined || (validDate(a.scheduleStart) && (!a.maturity || a.maturity > a.scheduleStart))) &&
    [1, 2, 4, 12].includes(a.frequency)
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
