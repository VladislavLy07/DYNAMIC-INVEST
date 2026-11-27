import { portfolioSummary } from '../finance/engine.ts'
import type { Asset, FxRates } from '../finance/model.ts'

export function portfolioInsight(assets: Asset[], fx: FxRates, date: string) {
  const { capital, reserve } = portfolioSummary(assets, fx, date)
  if (!capital) return 'Добавьте активы, чтобы оценить структуру капитала.'
  const issuers = new Map<string, number>()
  for (const asset of assets) {
    issuers.set(asset.issuer, (issuers.get(asset.issuer) ?? 0) + asset.amount * fx[asset.currency])
  }
  const top = [...issuers].sort((a, b) => b[1] - a[1])[0]
  const percent = new Intl.NumberFormat('ru', { style: 'percent', maximumFractionDigits: 1 })
  return `Ликвидный резерв составляет ${percent.format(reserve / capital)} капитала. Крупнейший эмитент, ${top[0]}, занимает ${percent.format(top[1] / capital)} портфеля.`
}
