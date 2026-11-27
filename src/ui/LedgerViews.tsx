import { useState } from 'react'
import { CalendarDays, ChevronRight, Download } from 'lucide-react'
import { eventTotals, financialEventLabel, type FinancialEvent } from '../finance/ledger'
import { downloadFile, eventsCsv, eventsIcs } from '../reporting/files'
import { monthName, rub, shortDate } from './format'
import type { Projection } from './CapitalChart'

function groups<T>(values: T[], key: (item: T) => string) {
  const result = new Map<string, T[]>()
  for (const item of values) {
    const group = key(item)
    if (!result.has(group)) result.set(group, [])
    result.get(group)!.push(item)
  }
  return [...result]
}

function EventTable({ events }: { events: FinancialEvent[] }) {
  return <div className="table-scroll"><table>
    <thead><tr><th>Дата</th><th>Инструмент</th><th>Событие</th><th>Статус и основание</th><th className="numeric">Сумма, ₽</th></tr></thead>
    <tbody>{events.map((e, i) => <tr key={i}><td>{e.date}</td><td><b>{e.name}</b></td><td>{financialEventLabel(e)}</td><td>{e.status === 'forecast' ? 'Прогноз' : 'Подтверждено'} · {e.source}</td><td className="numeric">{rub(e.rubles)}</td></tr>)}</tbody>
  </table></div>
}

export function YearlyLedger({ projection }: { projection: Projection }) {
  const [open, setOpen] = useState<string[]>([])
  const renderedYears = [...new Set(projection.points.map(p => p.date.slice(0, 4)))]
  const toggle = (key: string) => setOpen(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key])
  let opening = projection.opening
  return <section className="panel feature-panel">
    <div className="panel-heading"><div><h2>Годовая и помесячная аналитика</h2><p>Год → месяц → инструмент → событие</p></div><button className="button quiet" onClick={() => downloadFile('dynamic-invest-events.csv', eventsCsv(projection.events), 'text/csv;charset=utf-8')}><Download size={16}/>CSV</button></div>
    <div className="ledger-years">{renderedYears.map(year => {
      const yearEvents = projection.events.filter(e => e.date.startsWith(year))
      const totals = eventTotals(yearEvents)
      const previous = opening
      const monthsCovered = projection.points.slice(1).filter(point => point.date.startsWith(year)).length
      opening = Math.round((opening + totals.net + totals.contribution - totals.withdrawn) * 100) / 100
      return <div key={year} className="ledger-level">
        <button className="ledger-toggle" aria-expanded={open.includes(year)} onClick={() => toggle(year)}><ChevronRight size={17}/><b>{year}</b><span>Чистый доход {rub(totals.net)}</span><span>{rub(opening)}</span></button>
        {open.includes(year) && <div className="ledger-body">
          <dl className="ledger-summary">{[
            ['На начало периода', previous], ['Пополнения', totals.contribution], ['Изъятия', totals.withdrawn], ['Валовой доход', totals.gross],
            ['Выплаченный доход', totals.paid], ['Возврат номинала', totals.principal], ['Переоценка', totals.valuation],
            ['Средний доход в месяц', monthsCovered ? totals.paid / monthsCovered : 0], ['Комиссии', totals.fees], ['Налоговые обязательства', totals.assessed], ['Уплаченные налоги', totals.taxPaid],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{rub(Number(value))}</dd></div>)}</dl>
          {groups(yearEvents, e => e.date.slice(0, 7)).map(([month, monthEvents]) => <div key={month} className="ledger-level">
            <button className="ledger-toggle" aria-expanded={open.includes(month)} onClick={() => toggle(month)}><ChevronRight size={16}/><b>{monthName(month + '-01')}</b><span>Выплачено {rub(eventTotals(monthEvents).paid)}</span></button>
            {open.includes(month) && <div className="ledger-body">{groups(monthEvents, e => e.instrument).map(([id, list]) => {
              const key = month + '/' + id
              return <div className="ledger-level" key={id}><button className="ledger-toggle" aria-expanded={open.includes(key)} onClick={() => toggle(key)}><ChevronRight size={15}/><b>{list[0].name}</b><span>{list.length} событий</span></button>
                {open.includes(key) && <EventTable events={list}/>}</div>
            })}</div>}
          </div>)}
          {!yearEvents.length && <p className="empty">В этом периоде событий нет.</p>}
        </div>}
      </div>
    })}</div>
  </section>
}

export function LedgerCalendar({ projection }: { projection: Projection }) {
  const payments = projection.events.filter(e => ['income', 'principal', 'reinvestment', 'fee', 'tax'].includes(e.type))
  const periods = [...new Set(projection.points.map(p => p.date.slice(0, 7)))]
  const [view, setView] = useState<'month' | 'year'>('month')
  const [period, setPeriod] = useState(payments[0]?.date.slice(0, 7) ?? periods[0])
  const [asset, setAsset] = useState('')
  const date = periods.includes(period) ? period : periods[0]
  const visible = payments.filter(e => e.date.startsWith(view === 'year' ? date.slice(0, 4) : date) && (!asset || e.instrument === asset))
  return <section className="panel feature-panel stack">
    <div className="panel-heading"><div><h2>Календарь выплат</h2><p>Денежные события по выбранному горизонту</p></div><div className="toolbar"><button className="button quiet" onClick={() => downloadFile('dynamic-invest-cash.csv', eventsCsv(visible), 'text/csv;charset=utf-8')}><Download size={16}/>CSV</button><button className="button quiet" onClick={() => downloadFile('dynamic-invest.ics', eventsIcs(visible), 'text/calendar;charset=utf-8')}><CalendarDays size={16}/>ICS</button></div></div>
    <div className="filter-row"><div className="segmented"><button aria-pressed={view === 'month'} onClick={() => setView('month')}>Месяц</button><button aria-pressed={view === 'year'} onClick={() => setView('year')}>Год</button></div>
      <label>Период<select value={view === 'month' ? date : date.slice(0, 4)} onChange={e => setPeriod(view === 'month' ? e.target.value : periods.find(p => p.startsWith(e.target.value)) ?? periods[0])}>{(view === 'month' ? periods : [...new Set(periods.map(p => p.slice(0, 4)))]).map(key => <option key={key} value={key}>{key.length > 4 ? monthName(key + '-01') + ' ' + key.slice(0, 4) : key}</option>)}</select></label>
      <label>Инструмент<select value={asset} onChange={e => setAsset(e.target.value)}><option value="">Все</option>{groups(payments, e => e.instrument).map(([id, list]) => <option key={id} value={id}>{list[0].name}</option>)}</select></label>
    </div>
    {visible.length ? <><div className="calendar-total"><span>Чистый поток в денежный резерв</span><strong>{rub(eventTotals(visible).cashFlow)}</strong></div><EventTable events={visible}/></> : <p className="empty">В выбранном периоде выплат нет.</p>}
  </section>
}

export function Upcoming({ projection }: { projection: Projection }) {
  const payments = projection.events.filter(e => ['income', 'principal'].includes(e.type)).slice(0, 4)
  return <section className="panel feature-panel"><div className="panel-heading"><div><h2>Ближайшие выплаты</h2><p>Модельный график поступлений</p></div><a className="button quiet" href="#calendar">Весь календарь</a></div>
    {payments.length ? <div className="upcoming-list">{payments.map((p, i) => <div key={i}><span className="tile blue"><CalendarDays size={16}/></span><div><b>{p.name}</b><small>{shortDate(p.date)} · {financialEventLabel(p)}</small></div><strong>{rub(p.rubles)}</strong></div>)}</div> : <p className="empty">В выбранном горизонте выплат нет.</p>}
  </section>
}
