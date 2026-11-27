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
  contract?: ContractTerms
}

export interface ContractTerms {
  principal?: number
  capitalization?: boolean
  accrual?: 'interim' | 'daily' | 'minimum'
  annualFee?: number
  earlyRate?: number
  renewalRate?: number
  movements?: { date: string; amount: number }[]
  rateChanges?: { date: string; rate: number }[]
  schedule?: { date: string; income: number; principal: number }[]
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
    Number.isFinite(a.rate) && a.rate >= (['ПИФы', 'Акции', 'Золото'].includes(a.kind) ? -99.99 : 0) && a.rate <= 100 &&
    (a.maturity === '' || validDate(a.maturity)) &&
    (a.scheduleStart === undefined || (validDate(a.scheduleStart) && (!a.maturity || a.maturity > a.scheduleStart))) &&
    [1, 2, 4, 12].includes(a.frequency) && validContract(a.contract)
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}


function validContract(terms: unknown): boolean {
  if (terms === undefined) return true
  if (!terms || typeof terms !== 'object' || Array.isArray(terms)) return false
  const t = terms as ContractTerms
  const number = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
  const optional = (n: unknown, min: number, max: number) => n === undefined || number(n, min, max)
  const rows = <T extends { date: string }>(list: T[] | undefined, check: (value: T) => boolean) =>
    list === undefined || (Array.isArray(list) && list.length <= 500 && list.every(value => value && validDate(value.date) && check(value)) &&
      new Set(list.map(value => value.date)).size === list.length)
  return optional(t.principal, .01, 1e12) && optional(t.annualFee, 0, 100) && optional(t.earlyRate, 0, 100) &&
    optional(t.renewalRate, 0, 100) && (t.capitalization === undefined || typeof t.capitalization === 'boolean') &&
    (t.accrual === undefined || ['interim', 'daily', 'minimum'].includes(t.accrual)) &&
    rows(t.movements, item => number(item.amount, -1e12, 1e12)) &&
    rows(t.rateChanges, item => number(item.rate, 0, 100)) &&
    rows(t.schedule, item => number(item.income, 0, 1e12) && number(item.principal, 0, 1e12)) &&
    (!t.schedule?.length || (t.principal !== undefined && t.schedule.reduce((sum, item) => sum + Math.round(item.principal * 100), 0) <= Math.round(t.principal * 100)))
}
