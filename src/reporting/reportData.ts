import { financialEventLabel, type projectLedger } from '../finance/ledger.ts'
import type { FxRates } from '../finance/model.ts'
import type { Portfolio } from '../portfolio/workspace.ts'
import { concentration, typesForPortfolio } from '../analytics/wealth.ts'
import type { Worksheet } from './xlsx.ts'

export type ProjectedLedger = ReturnType<typeof projectLedger>

export function reportSheets(portfolio: Portfolio, date: string, projection: ProjectedLedger, fx: FxRates): Worksheet[] {
  return [
    { name: 'Параметры', rows: [
      ['Показатель', 'Значение'], ['Портфель', portfolio.name], ['Дата модели', date], ['Конец горизонта', projection.end],
      ['Капитал на начало, RUB', projection.opening], ['Капитал на конец, RUB', projection.final.value],
      ['Валовой результат, RUB', projection.totals.gross], ['Чистый результат, RUB', projection.totals.net],
      ['Денежный доход, RUB', projection.totals.paid], ['Комиссии, RUB', projection.totals.fees], ['Условный налог, RUB', projection.totals.assessed],
      ['Метод', 'Сценарный финансовый журнал. Возврат номинала не считается доходом.'],
      ...projection.warnings.map(w => ['Риск', w]),
    ] },
    { name: 'Траектория', rows: [
      ['Дата', 'Капитал, RUB', 'Реальные RUB', 'Валовой результат', 'Чистый результат'],
      ...projection.points.map(point => [point.date, point.value, point.real, point.gross, point.net]),
    ] },
    { name: 'События', rows: [
      ['Дата', 'Актив', 'Событие', 'Валюта', 'Сумма', 'Сумма в RUB', 'Статус', 'Источник'],
      ...projection.events.map(event => [event.date, event.name, financialEventLabel(event), event.currency, event.amount, event.rubles, event.status === 'forecast' ? 'Прогноз' : 'Подтверждено', event.source]),
    ] },
    { name: 'Риски и структура', rows: [
      ['Срез', 'Позиция', 'Оценка, RUB', 'Доля, %'],
      ...typesForPortfolio(portfolio, fx).map(item => ['Класс актива', item.name, item.value, projection.opening ? 100 * item.value / projection.opening : 0]),
      ...concentration(portfolio, fx).issuers.map(([name, value]) => ['Эмитент', name, value, projection.opening ? 100 * value / projection.opening : 0]),
    ] },
  ]
}
