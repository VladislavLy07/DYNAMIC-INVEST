import Decimal from 'decimal.js'
import { addMonths, daysBetween } from './engine.ts'
import { money } from './ledger.ts'
import { depositTax } from '../tax/deposits.ts'
import { securitiesTax } from '../tax/securities.ts'
import { validDate } from './model.ts'
import type { FundProfile } from '../market/fundDisclosures.ts'

export const slideHorizons = [6, 12, 24, 36, 60] as const
export type SlideHorizon = typeof slideHorizons[number]
export type TaxModel = 'resident' | 'flat13' | 'gross'
export const slideTaxYear = 2026
export const scenarioLabels = ['Осторожный', 'Базовый', 'Оптимистичный'] as const
export const fundRates: Record<FundProfile, readonly [number, number, number]> = {
  cash: [.08, .12, .18],
  bonds: [.02, .10, .16],
  mixed: [-.08, .09, .22],
  shares: [-.18, .12, .30],
  fx: [-.10, .08, .24],
  gold: [-.15, .07, .25],
}

export interface SlideInput {
  amount: number
  months: SlideHorizon
  model: TaxModel
  otherBase: number
}

function valid({ amount, months, otherBase }: SlideInput) {
  return Number.isFinite(amount) && amount >= .01 && amount <= 1e9 && slideHorizons.includes(months) && money(amount) === amount &&
    Number.isFinite(otherBase) && otherBase >= 0 && otherBase <= 1e12
}

export function fundPeriodReturn(annualRate: number, months: SlideHorizon) {
  return new Decimal(1).plus(annualRate).pow(new Decimal(months).div(12)).minus(1).toNumber()
}

function summarize(input: SlideInput, beforeTax: Decimal, tax: number | null) {
  const grossProfit = money(beforeTax.minus(input.amount))
  const grossValue = money(beforeTax)
  const netValue = tax === null ? null : money(beforeTax.minus(tax))
  const netProfit = netValue === null ? null : money(new Decimal(netValue).minus(input.amount))
  const annual = (value: number) => new Decimal(value).div(input.amount).pow(new Decimal(12).div(input.months)).minus(1).toNumber()
  return {
    grossProfit, grossValue, grossReturn: grossProfit / input.amount, grossAnnual: annual(grossValue),
    tax, netValue, netProfit, netReturn: netProfit === null ? null : netProfit / input.amount,
    netAnnual: netValue === null ? null : annual(netValue),
  }
}

export function fundScenario(input: SlideInput, annualRate: number) {
  if (!valid(input) || !Number.isFinite(annualRate) || annualRate < -1 || annualRate > 1) return null
  const beforeTax = new Decimal(money(new Decimal(input.amount).times(new Decimal(1).plus(annualRate).pow(new Decimal(input.months).div(12)))))
  const profit = beforeTax.minus(input.amount)
  let tax = null
  if (input.model === 'flat13') tax = money(Decimal.max(profit, 0).times(.13))
  if (input.model === 'resident') {
    const date = `${slideTaxYear}-12-31`
    const result = securitiesTax({
      year: slideTaxYear, resident: true, compatibleLoss: 0, otherBase: input.otherBase, withholding: 0,
      events: [{ kind: 'sale', proceeds: { date, currency: 'RUB', amount: beforeTax.toNumber() },
        basis: { date, currency: 'RUB', amount: input.amount }, expensesRub: 0 }],
    })
    if (!('error' in result)) tax = result.tax
  }
  return { ...summarize(input, beforeTax, tax), grossReturn: fundPeriodReturn(annualRate, input.months), grossAnnual: annualRate }
}

export type ModelKind = 'deposit' | 'savings' | 'gold' | 'bond' | 'dfa'

export function instrumentScenario(input: SlideInput, kind: ModelKind, rate: number, start: string, keyRate: number) {
  if (!valid(input) || !validDate(start) || !Number.isFinite(rate) || rate < (kind === 'gold' ? -.99 : 0) || rate > 1) return null
  const startAmount = new Decimal(input.amount)
  const end = addMonths(start, input.months)
  const bank = kind === 'deposit' || kind === 'savings'
  const incomeByYear = new Map<string, Decimal>()
  let value = startAmount
  if (kind === 'deposit' || kind === 'dfa') {
    // One contractual payment at maturity, day count ACT/365.
    const interest = startAmount.times(rate).times(daysBetween(start, end)).div(365)
    value = value.plus(interest)
    if (bank) incomeByYear.set(end.slice(0, 4), interest)
  } else if (kind === 'savings') {
    // Constant daily balance between monthly capitalizations; a constant nominal rate is a model input.
    let date = start
    for (let month = 1; month <= input.months; month++) {
      const next = addMonths(start, month)
      const interest = new Decimal(money(value.times(rate).times(daysBetween(date, next)).div(365)))
      const year = next.slice(0, 4)
      incomeByYear.set(year, (incomeByYear.get(year) ?? new Decimal(0)).plus(interest))
      value = value.plus(interest)
      date = next
    }
  } else if (kind === 'bond') {
    // Purchase and maturity at par, one coupon every six months, no reinvestment.
    const coupon = new Decimal(money(startAmount.times(rate).div(2)))
    for (let month = 6; month <= input.months; month += 6) {
      const year = addMonths(start, month).slice(0, 4)
      incomeByYear.set(year, (incomeByYear.get(year) ?? new Decimal(0)).plus(coupon))
      value = value.plus(coupon)
    }
  } else {
    // One spot purchase and sale. Apply a 2% liquidation spread once.
    value = value.times(new Decimal(1).plus(rate).pow(new Decimal(input.months).div(12))).times(.98)
  }
  value = new Decimal(money(value))
  let tax = null
  if (bank && input.model === 'resident' && Number.isFinite(keyRate) && keyRate >= 0 && keyRate <= 100) {
    const yearlyTaxes = [...incomeByYear.values()].map(interest => {
      return depositTax(slideTaxYear, [money(interest)], 0, input.otherBase, 'resident', keyRate)?.tax
    })
    if (yearlyTaxes.every((yearTax): yearTax is number => yearTax !== undefined)) tax = yearlyTaxes.reduce((sum, yearTax) => sum + yearTax, 0)
  }
  if (kind === 'bond' && input.model === 'resident') {
    const date = `${slideTaxYear}-12-31`
    const yearly = [...incomeByYear.values()].map(interest => securitiesTax({
      year: slideTaxYear, resident: true, compatibleLoss: 0, otherBase: input.otherBase, withholding: 0,
      events: [{ kind: 'coupon', proceeds: { date, currency: 'RUB', amount: money(interest) }, expensesRub: 0 }],
    }))
    tax = yearly.some(result => result.tax === undefined) ? null : yearly.reduce((sum, result) => sum + (result.tax ?? 0), 0)
  }
  return summarize(input, value, tax)
}
