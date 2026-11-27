import Decimal from 'decimal.js'
import { addMonths } from '../finance/engine.ts'
import { money } from '../finance/ledger.ts'
import { validAsset, type Asset, type FxRates } from '../finance/model.ts'

export interface Portfolio {
  id: string
  name: string
  budget: number
  assets: Asset[]
  contribution: number
  withdrawal: number
  reinvest: number
  demo: boolean
}

export interface Workspace {
  version: 2
  active: string
  portfolios: Portfolio[]
}

export const workspaceKey = 'dynamic-invest:workspace:v2'
export const maxBackupBytes = 1_000_000
export const maxAssets = 100
export const maxPortfolios = 12
// Stable conversion for the acquisition budget and migration of version 1.0.
export const accountingFx: FxRates = { RUB: 1, USD: 95, CNY: 13, EUR: 103 }
const portfolioKey = 'dynamic-invest:portfolio:v1'

function makeExample(today: string): Portfolio {
  const defaults = { issuer: 'Условный эмитент', currency: 'RUB', liquidity: 'Средний', risk: 'Средний', frequency: 12, maturity: '', scheduleStart: today } as const
  const positions: Pick<Asset, 'id' | 'name' | 'kind' | 'amount' | 'rate' | 'contract' | 'maturity'>[] = [
    { id: 'd1', name: 'Вклад №1', kind: 'Вклады', amount: 3e6, rate: 15, maturity: addMonths(today, 12), contract: { accrual: 'daily' } },
    { id: 'd2', name: 'Вклад №2', kind: 'Вклады', amount: 2e6, rate: 14, maturity: addMonths(today, 6), contract: { accrual: 'daily' } },
    { id: 'saving', name: 'Накопительный счёт', kind: 'Накопительные счета', amount: 1e6, rate: 11, contract: { accrual: 'daily' }, maturity: '' },
    { id: 'fund', name: 'Инвестиционный фонд', kind: 'ПИФы', amount: 2e6, rate: 9, maturity: '' },
    { id: 'cfa', name: 'Долговой ЦФА', kind: 'ЦФА', amount: 1e6, rate: 16, maturity: addMonths(today, 12) },
    { id: 'gold', name: 'Физическое золото', kind: 'Золото', amount: 1e6, rate: 6, maturity: '' },
  ]
  return { id: 'example', name: 'Демонстрационный портфель', budget: 10e6, assets: positions.map(position => ({ ...defaults, ...position, cost: position.amount })), contribution: 0, withdrawal: 0, reinvest: 0, demo: true }
}

export function allocation(assets: Asset[], fx: FxRates = accountingFx) {
  return money(assets.reduce((sum, asset) => sum.plus(money(new Decimal(asset.cost).times(fx[asset.currency]))), new Decimal(0)))
}

export function available(portfolio: Portfolio, fx: FxRates = accountingFx) {
  return money(new Decimal(portfolio.budget).minus(allocation(portfolio.assets, fx)))
}

export function migratePortfolio(raw: unknown): Workspace {
  if (!Array.isArray(raw) || raw.length > maxAssets || !raw.every(validAsset) || new Set(raw.map(a => a.id)).size !== raw.length) throw new Error('Портфель версии 1.0 не прошёл проверку.')
  return { version: 2, active: 'legacy', portfolios: [{ id: 'legacy', name: 'Портфель версии 1.0', budget: allocation(raw), assets: raw, contribution: 0, withdrawal: 0, reinvest: 0, demo: false }] }
}

const validText = (s: unknown, max: number) => typeof s === 'string' && s.trim() !== '' && s.length <= max
const validAmount = (n: unknown, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max

function checkedPortfolio(value: unknown): value is Portfolio {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Portfolio
  return validText(p.id, 100) && validText(p.name, 100) && typeof p.demo === 'boolean' &&
    validAmount(p.budget, 1e14) && validAmount(p.contribution, 1e12) && validAmount(p.withdrawal, 1e12) && validAmount(p.reinvest, 100) &&
    Array.isArray(p.assets) && p.assets.length <= maxAssets &&
    p.assets.every(a => validAsset(a) && validText(a.id, 100) && validText(a.name, 100) && validText(a.issuer, 100)) &&
    new Set(p.assets.map(a => a.id)).size === p.assets.length && available(p) >= 0
}

export function decodeWorkspace(raw: string): Workspace {
  if (new TextEncoder().encode(raw).length > maxBackupBytes) throw new Error('Файл превышает 1 МБ.')
  const value: unknown = JSON.parse(raw)
  if (Array.isArray(value)) return migratePortfolio(value)
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 2) throw new Error('Неизвестная версия портфеля.')
  const { active, portfolios } = value as Workspace
  if (!Array.isArray(portfolios) || !portfolios.length || portfolios.length > maxPortfolios || !portfolios.every(checkedPortfolio) ||
    new Set(portfolios.map(p => p.id)).size !== portfolios.length || !portfolios.some(p => p.id === active)) throw new Error('Проверьте структуру портфелей, лимиты и уникальность идентификаторов.')
  return { version: 2, active, portfolios }
}

export function readWorkspace(today: string, storage: Pick<Storage, 'getItem'> = localStorage) {
  const fallback: Workspace = { version: 2, active: 'example', portfolios: [makeExample(today)] }
  try {
    const raw = storage.getItem(workspaceKey)
    if (raw !== null) return { data: decodeWorkspace(raw), message: '' }
    const legacy = storage.getItem(portfolioKey)
    if (legacy !== null) return { data: decodeWorkspace(legacy), message: 'Портфель версии 1.0 перенесён. Договорные ставки сохранены.' }
    return { data: fallback, message: '' }
  } catch {
    return { data: fallback, message: 'Локальные данные не удалось прочитать. Показан условный портфель.' }
  }
}

export function persistWorkspace(data: Workspace) {
  const json = JSON.stringify(data)
  decodeWorkspace(json)
  localStorage.setItem(workspaceKey, json)
}

export function replacePortfolio(data: Workspace, next: Portfolio): Workspace {
  if (!checkedPortfolio(next)) throw new Error('Проверьте лимит распределения и параметры портфеля.')
  return { ...data, portfolios: data.portfolios.map(p => p.id === next.id ? next : p) }
}
