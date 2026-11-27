import { validAsset, type Asset } from '../finance/model.ts'
import { demoAssets } from './demo.ts'

export const portfolioKey = 'dynamic-invest:portfolio:v1'

export function loadPortfolio(today: string): { assets: Asset[]; message: string } {
  const fallback = demoAssets(today)
  try {
    const raw = localStorage.getItem(portfolioKey)
    if (raw === null) return { assets: fallback, message: '' }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every(validAsset) && new Set(parsed.map(a => a.id)).size === parsed.length) {
      return { assets: parsed, message: '' }
    }
  } catch {
    return { assets: fallback, message: 'Локальный портфель недоступен. Показан демопортфель.' }
  }
  return { assets: fallback, message: 'Сохранённый портфель повреждён. Показан демопортфель.' }
}

export function savePortfolio(assets: Asset[]) {
  localStorage.setItem(portfolioKey, JSON.stringify(assets))
}
