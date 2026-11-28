import Decimal from 'decimal.js'
import { addMonths, daysBetween } from './engine.ts'
import { money } from './ledger.ts'
import { validDate } from './model.ts'
import { depositTax, taxRules } from '../tax/deposits.ts'
import type { ProductTerm, ProductVersion } from '../market/catalog.ts'

export interface BankParameters {
  amount: number
  date: string
  months: number
  allowanceUsed: boolean
  assumedAllowance: number
  otherBase: number
  qualifies: boolean
}

const lastSupportedYear = taxRules.at(-1)!.year

export function bankProjection(input: BankParameters, rate: number, frequency: 'maturity' | 'monthly' | 'capitalized',
  promotion?: { months: number; rate: number }, fixedDays?: number) {
  const { amount, date, months, allowanceUsed, assumedAllowance, otherBase } = input
  if (!Number.isFinite(amount) || amount < .01 || amount > 1e9 || money(amount) !== amount ||
    !validDate(date) || (fixedDays !== undefined && (!Number.isInteger(fixedDays) || fixedDays < 1 || fixedDays > 2000)) || !Number.isInteger(months) || months < 1 || months > 60 ||
    !Number.isFinite(rate) || rate < 0 || rate > 100 ||
    !Number.isFinite(assumedAllowance) || assumedAllowance < 0 || assumedAllowance > 1e6 ||
    !Number.isFinite(otherBase) || otherBase < 0 || otherBase > 1e12) return null

  const end = fixedDays === undefined ? addMonths(date, months)
    : new Date(Date.parse(date) + fixedDays * 86400000).toISOString().slice(0, 10)
  const paymentDates = frequency === 'maturity' ? [end] : Array.from({ length: months }, (_, i) => addMonths(date, i + 1))
  if (frequency === 'capitalized') {
    const monthStart = date.slice(0, 7) + '-01'
    const monthEnds = Array.from({ length: months + 1 }, (_, i) =>
      new Date(Date.parse(addMonths(monthStart, i + 1)) - 86400000).toISOString().slice(0, 10))
    paymentDates.splice(0, paymentDates.length, ...monthEnds.filter(monthEnd => monthEnd > date && monthEnd < end), end)
  }
  let previous = date
  let principal = new Decimal(amount)
  const payments = new Map<number, Decimal>()
  for (const [index, next] of paymentDates.entries()) {
    const annualRate = promotion && index + 1 <= promotion.months ? promotion.rate : rate
    const interest = new Decimal(money(principal.times(annualRate).times(daysBetween(previous, next)).div(36500)))
    const year = Number(next.slice(0, 4))
    payments.set(year, (payments.get(year) ?? new Decimal(0)).plus(interest))
    if (frequency === 'capitalized') principal = principal.plus(interest)
    previous = next
  }
  const years = [...payments.entries()].map(([year, value]) => {
    const ruleYear = Math.min(year, lastSupportedYear)
    const gross = money(value)
    const rule = taxRules.find(candidate => candidate.year === ruleYear)
    const allowance = allowanceUsed ? 0 : (rule?.maximumKeyRate === null ? assumedAllowance : (rule?.maximumKeyRate ?? 0) * 10000)
    const calculation = depositTax(ruleYear, [gross], allowanceUsed ? (rule?.maximumKeyRate ?? assumedAllowance / 10000) * 10000 : 0,
      otherBase, 'resident', assumedAllowance / 10000)
    return { year, gross, allowance, tax: calculation?.tax ?? null }
  })
  const gross = money(years.reduce((sum, year) => sum.plus(year.gross), new Decimal(0)))
  const tax = years.some(year => year.tax === null) ? null : years.reduce((sum, year) => sum + (year.tax ?? 0), 0)
  const net = tax === null ? null : money(new Decimal(gross).minus(tax))
  return { gross, tax, net, netReturn: net === null ? null : net / amount, years }
}

export function bankScenarios(item: ProductVersion, input: BankParameters) {
  const deposit = item.kind === 'Вклады'
  const days = validDate(input.date) ? daysBetween(input.date, addMonths(input.date, input.months)) : 0
  const frequency = item.bankPayment ?? (deposit ? 'maturity' : 'monthly')
  const eligible = (term: ProductTerm) => term.rate !== null && item.currency !== 'CNY' &&
    (term.min === null || input.amount >= term.min) && (term.max === null || input.amount <= term.max)
  const contracts = item.terms.filter(term => eligible(term) && !term.promotion && (deposit
    ? term.months === input.months || (term.fixedDays !== undefined && term.fixedDays === days)
    : term.months === null))
  const ordinary = contracts.find(term => !term.qualified)
  const special = contracts.find(term => term.qualified)
  const promotion = item.terms.find(term => term.promotion && term.months && eligible(term))
  const project = (term: ProductTerm | undefined, promotional?: ProductTerm) => term?.rate == null ? null
    : bankProjection(input, term.rate, frequency,
      promotional?.months && promotional.rate !== null ? { months: promotional.months, rate: promotional.rate } : undefined, term.fixedDays)

  const base = project(ordinary)
  const qualified = special ? project(special) : promotion ? project(ordinary, promotion) : null
  return { base, qualified, result: input.qualifies && (special !== undefined || promotion !== undefined) ? qualified : base, frequency }
}
