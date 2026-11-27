import Decimal from 'decimal.js'
import { money } from '../finance/ledger.ts'
import type { FinancialEvent } from '../finance/ledger.ts'
import type { Asset } from '../finance/model.ts'

export const taxSource = 'https://www.nalog.gov.ru/rn77/taxation/taxes/ndfl/ndfl_fl/onb_ndfl/'
export const nonresidentSource = 'https://www.nalog.gov.ru/new2025/'
export const taxRules = [
  { year: 2023, threshold: 5_000_000, maximumKeyRate: 15, source: 'https://www.nalog.gov.ru/rn50/news/activities_fts/15421016/' },
  { year: 2024, threshold: 5_000_000, maximumKeyRate: 21, source: 'https://www.nalog.gov.ru/rn51/news/activities_fts/16174423/' },
  { year: 2025, threshold: 2_400_000, maximumKeyRate: 21, source: 'https://www.nalog.gov.ru/rn25/ifns/r25_02/info/16650006/' },
  { year: 2026, threshold: 2_400_000, maximumKeyRate: null, source: taxSource },
] as const

export function depositTax(year: number, bankInterest: number[], otherInterest: number, sharedTaxableBase: number, residency: 'resident' | 'nonresident', provisionalRate?: number) {
  const rule = taxRules.find(r => r.year === year)
  if (!rule) return null
  const rate = rule.maximumKeyRate ?? provisionalRate
  if (bankInterest.some(a => !Number.isFinite(a) || a < 0) || ![otherInterest, sharedTaxableBase].every(a => Number.isFinite(a) && a >= 0) ||
    rate === undefined || !Number.isFinite(rate) || rate < 0 || rate > 100) return null
  const gross = money(bankInterest.reduce((sum, amount) => sum.plus(amount), new Decimal(otherInterest)))
  const exemption = money(1_000_000 * rate / 100)
  const taxable = money(Math.max(0, gross - exemption))
  const flat = residency === 'nonresident' && year >= 2025
  const lower = flat ? 0 : Math.min(taxable, Math.max(0, rule.threshold - sharedTaxableBase))
  const exactTax = new Decimal(lower).times(.13).plus(new Decimal(taxable).minus(lower).times(.15))
  const tax = exactTax.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
  return { rule, flat, gross, exemption, taxable, tax, net: money(gross - tax), effective: gross ? tax / gross : null, provisional: rule.maximumKeyRate === null, dueYear: year + 1 }
}

export function bankInterestByAsset(assets: Asset[], events: FinancialEvent[], year: number) {
  return assets.filter(a => ['Вклады', 'Накопительные счета'].includes(a.kind) && a.currency === 'RUB')
    .map(asset => ({
      name: asset.name,
      amount: money(events.filter(e => e.instrument === asset.id && e.type === 'income' && e.date.startsWith(String(year))).reduce((sum, e) => sum + e.rubles, 0)),
    })).filter(item => item.amount > 0)
}
