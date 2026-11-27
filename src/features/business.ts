export interface BusinessInputs {
  contacts: number
  conversion: number[]
  averageTicket: number
  outflows: number
  initialAum: number
  managementRate: number
  fixedCosts: number
  acquisitionCost: number
  salary: number
  variableShare: number
}

export function businessCase(input: BusinessInputs) {
  const funnel = [input.contacts]
  for (const conversion of input.conversion) funnel.push(funnel.at(-1)! * conversion / 100)
  const recruited = funnel.at(-1)! * input.averageTicket
  const nnm = recruited - input.outflows
  const aum = Math.max(0, input.initialAum + nnm)
  const commission = (input.initialAum + aum) / 2 * input.managementRate / 100
  const acquisition = input.contacts * input.acquisitionCost
  const variable = commission * input.variableShare / 100
  const actualCosts = input.fixedCosts + acquisition
  const payout = [input.salary, input.salary + variable, Math.max(input.salary, variable)]
  return {
    funnel, recruited, nnm, aum, commission, acquisition,
    payout: payout.map(remuneration => ({ remuneration, businessNet: commission - actualCosts - remuneration })),
    breakEvenAum: input.managementRate > 0 ? (actualCosts + input.salary) / (input.managementRate / 100) : null,
  }
}
