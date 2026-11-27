import Decimal from 'decimal.js'
import { validDate, type Currency } from '../finance/model.ts'
import type { Snapshot } from '../market/snapshot.ts'
import { availableAt } from '../market/snapshot.ts'
import { money } from '../finance/ledger.ts'

export const securitiesSource = 'https://www.nalog.gov.ru/rn77/news/activities_fts/16674056/'
export const passiveIncomeSource = 'https://www.nalog.gov.ru/nu/'
export type SecurityIncome = 'sale' | 'redemption' | 'coupon'
export const securityNames: Record<SecurityIncome, string> = { sale: 'Продажа', redemption: 'Погашение', coupon: 'Купон' }

interface Payment { date: string; currency: Currency; amount: number }
export interface TaxableSecurityEvent {
  kind: SecurityIncome
  proceeds: Payment
  basis?: Payment
  expensesRub: number
}
export interface PassiveTaxInput {
  year: number
  resident: boolean
  events: TaxableSecurityEvent[]
  compatibleLoss: number
  otherBase: number
  withholding: number
}

const D = Decimal.clone({ precision: 32, rounding: Decimal.ROUND_HALF_UP })
const threshold = 2_400_000

function rateAt(payment: Payment, data: Snapshot | undefined) {
  if (payment.currency === 'RUB') return { value: 1, date: payment.date }
  const quote = availableAt(data?.sources[payment.currency], payment.date)
  const last = data?.sources[payment.currency]?.series.at(-1)?.date
  const snapshotDate = data?.collectedAt.slice(0, 10)
  if (!quote || !last || !snapshotDate || payment.date > snapshotDate || quote.value <= 0 || Date.parse(payment.date) - Date.parse(quote.date) > 7 * 86400000) return null
  return quote
}

function marginalTax(taxable: Decimal, otherBase = 0) {
  const lower = Decimal.min(taxable, Decimal.max(0, new D(threshold).minus(otherBase)))
  return lower.times(.13).plus(taxable.minus(lower).times(.15)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
}

export function russianDividendTax(year: number, gross: number, withholding: number) {
  if ((year !== 2025 && year !== 2026) || ![gross, withholding].every(n => Number.isFinite(n) && n >= 0 && n <= 1e12)) return null
  const tax = marginalTax(new D(money(gross)))
  return { tax: tax.toNumber(), payable: money(Decimal.max(0, tax.minus(withholding))), net: money(new D(gross).minus(tax)) }
}

function validPayment(p: Payment) {
  return p && validDate(p.date) && ['RUB', 'USD', 'CNY', 'EUR'].includes(p.currency) && Number.isFinite(p.amount) && p.amount >= 0 && p.amount <= 1e12
}

export function securitiesTax(input: PassiveTaxInput, data?: Snapshot) {
  const { year, resident, events, compatibleLoss, otherBase, withholding } = input
  if (year !== 2025 && year !== 2026 || !resident) return { error: 'Расчёт поддерживает резидентов РФ за 2025 и 2026 годы.' } as const
  if (![compatibleLoss, otherBase, withholding].every(n => Number.isFinite(n) && n >= 0 && n <= 1e12) || events.length > 200) return { error: 'Проверьте суммы налоговых параметров.' } as const
  const rows: { proceeds: number; cost: number; expenses: number; result: number; proceedsRate: number; costRate: number | null; proceedsRateDate: string; costRateDate: string | null }[] = []
  for (const [i, entry] of events.entries()) {
    if (!Object.hasOwn(securityNames, entry.kind) || !validPayment(entry.proceeds) || Number(entry.proceeds.date.slice(0, 4)) !== year ||
      !Number.isFinite(entry.expensesRub) || entry.expensesRub < 0 || entry.expensesRub > 1e12 ||
      (entry.kind !== 'coupon' && !entry.basis) || (entry.basis && (!validPayment(entry.basis) || entry.basis.date > entry.proceeds.date))) {
      return { error: `Операция №${i + 1}. Проверьте даты, затраты и налоговый год.` } as const
    }
    const inRate = entry.basis ? rateAt(entry.basis, data) : null
    const outRate = rateAt(entry.proceeds, data)
    if (!outRate || (entry.basis && !inRate)) return { error: `Операция №${i + 1}. На дату денежного потока нет проверенного курса Банка России.` } as const
    const proceeds = new D(entry.proceeds.amount).times(outRate.value)
    const cost = inRate && entry.basis ? new D(entry.basis.amount).times(inRate.value) : new D(0)
    const expenses = money(entry.expensesRub)
    rows.push({ proceeds: money(proceeds), cost: money(cost), expenses,
      result: money(new D(money(proceeds)).minus(money(cost)).minus(expenses)), proceedsRate: outRate.value,
      costRate: inRate?.value ?? null, proceedsRateDate: outRate.date, costRateDate: inRate?.date ?? null })
  }
  const financialResult = rows.reduce((sum, row) => sum.plus(row.result), new D(0))
  const offset = Decimal.min(compatibleLoss, Decimal.max(financialResult, 0))
  const taxable = Decimal.max(0, financialResult.minus(offset))
  const tax = marginalTax(taxable, otherBase)
  return {
    rows, financialResult: money(financialResult), retainedLoss: money(Decimal.max(0, financialResult.negated())),
    offset: money(offset), taxable: money(taxable), tax: tax.toNumber(), payable: money(Decimal.max(0, tax.minus(withholding))),
    estimatedOverpayment: money(Decimal.max(0, new D(withholding).minus(tax))), threshold,
  }
}
