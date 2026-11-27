import Decimal from 'decimal.js'
import { money } from '../finance/ledger.ts'

export interface ChinaInputs {
  capital: number
  days: number
  rubRate: number
  cnyRate: number
  entryFx: number
  exitShift: number
  spread: number
  rubInterestTax: number
  cnyInterestTax: number
}

export function compareDeposits(input: ChinaInputs) {
  const { capital, days, rubRate, cnyRate, entryFx, exitShift, spread, rubInterestTax, cnyInterestTax } = input
  if (!Object.values(input).every(Number.isFinite) || capital <= 0 || capital > 1e12 || !Number.isInteger(days) || days < 1 || days > 1826 ||
    entryFx <= 0 || entryFx > 1e6 || exitShift <= -100 || exitShift > 300 || spread < 0 || spread > 30 ||
    [rubRate, cnyRate, rubInterestTax, cnyInterestTax].some(value => value < 0 || value > 100)) return null
  const principal = new Decimal(capital)
  const spreadRatio = new Decimal(spread).div(100)
  const buyFx = new Decimal(entryFx).times(spreadRatio.plus(1))
  const cnyPrincipal = principal.div(buyFx)
  const gain = (amount: Decimal, rate: number, tax: number) => amount.times(rate).times(days).div(36_500).times(1 - tax / 100)
  const rubFinal = principal.plus(gain(principal, rubRate, rubInterestTax))
  const cnyFinal = cnyPrincipal.plus(gain(cnyPrincipal, cnyRate, cnyInterestTax))
  const saleFactor = new Decimal(1).minus(spreadRatio)
  const exitFx = new Decimal(entryFx).times(new Decimal(exitShift).div(100).plus(1))
  const rubEquivalent = cnyFinal.times(exitFx).times(saleFactor)
  const breakEvenFx = rubFinal.div(cnyFinal.times(saleFactor))
  return { rubFinal: money(rubFinal), cnyFinal: money(cnyFinal), rubEquivalent: money(rubEquivalent), difference: money(rubEquivalent.minus(rubFinal)),
    breakEvenFx: breakEvenFx.toNumber(), exitFx: exitFx.toNumber(), buyFx: buyFx.toNumber(), sellFx: exitFx.times(saleFactor).toNumber(),
    cnyProfit: money(cnyFinal.minus(cnyPrincipal)), rubProfit: money(rubFinal.minus(principal)) }
}
