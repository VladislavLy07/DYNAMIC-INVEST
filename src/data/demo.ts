import { addMonths } from '../finance/engine.ts'
import type { Asset, FxRates } from '../finance/model.ts'

export interface EstimateSnapshot {
  source: string
  asOf: string
  mode: 'demo' | 'live'
  fx: FxRates
}
export const demoMarket: EstimateSnapshot = {
  source: 'Условные курсы DYNAMIC INVEST',
  asOf: '2026-11-27',
  mode: 'demo',
  fx: { RUB: 1, USD: 95, CNY: 13, EUR: 103 },
}

export function demoAssets(today: string): Asset[] {
  const defaults = { currency: 'RUB', liquidity: 'Средний', risk: 'Низкий', frequency: 12, maturity: '', scheduleStart: today } as const
  return [
    { ...defaults, id: 'deposit', name: 'Вклад «Премьер»', kind: 'Вклады', issuer: 'Демо-Банк Север', amount: 3500000, cost: 3500000, rate: 16.8, maturity: addMonths(today, 10) },
    { ...defaults, id: 'ofz', name: 'ОФЗ-ПД 26248', kind: 'ОФЗ', issuer: 'Минфин России', amount: 2900000, cost: 2800000, rate: 12.25, frequency: 2, maturity: addMonths(today, 29) },
    { ...defaults, id: 'corp', name: 'Корпоративные облигации', kind: 'Корпоративные облигации', issuer: 'Демо-Энерго', amount: 1780000, cost: 1730000, rate: 17, risk: 'Средний', frequency: 4, maturity: addMonths(today, 17) },
    { ...defaults, id: 'stock', name: 'Портфель акций', kind: 'Акции', issuer: 'Демо-Индекс', amount: 1540000, cost: 1400000, rate: 8, risk: 'Высокий', frequency: 4 },
    { ...defaults, id: 'gold', name: 'Инвестиционное золото', kind: 'Золото', issuer: 'Демо-Депозитарий', amount: 1480000, cost: 1310000, rate: 0 },
    { ...defaults, id: 'cash', name: 'Ликвидный резерв', kind: 'Денежный резерв', issuer: 'Демо-Банк Север', amount: 2145000, cost: 2145000, rate: 0, liquidity: 'Высокий' },
  ]
}
