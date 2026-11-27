import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, cashFlows } from '../finance/engine'
import type { Asset, FxRates } from '../finance/model'
import { compact, monthName, rub, shortDate } from './format'

export function Calendar({ assets, fx, today }: { assets: Asset[]; fx: FxRates; today: string }) {
  const [initialDate] = useState(() => cashFlows(assets, fx, today, addMonths(today, 12))[0]?.date ?? today)
  const [year, setYear] = useState(Number(initialDate.slice(0, 4)))
  const [month, setMonth] = useState(initialDate.slice(5, 7))
  const [view, setView] = useState<'year' | 'month'>('month')
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const all = cashFlows(assets, fx, today, `${year}-12-31`).filter(flow => flow.date.startsWith(String(year)))
  const flows = view === 'year' ? all : all.filter(flow => flow.date.slice(5, 7) === month)
  const totals = months.map(value => ({
    label: monthName(`${year}-${value}-01`).slice(0, 3),
    month: value,
    value: all.filter(flow => flow.date.slice(5, 7) === value).reduce((sum, flow) => sum + flow.amount, 0),
  }))
  return <div className="stack">
    <section className="panel feature-panel">
      <div className="panel-heading calendar-heading">
        <div><h2>План поступлений</h2><p>Проценты, купоны, дивиденды и погашения</p></div>
        <div className="toolbar">
          <div className="segmented"><button aria-pressed={view === 'month'} onClick={() => setView('month')}>Месяц</button><button aria-pressed={view === 'year'} onClick={() => setView('year')}>Год</button></div>
          <div className="year-control"><button className="icon-button" aria-label="Предыдущий год" disabled={year <= Number(today.slice(0, 4))} onClick={() => setYear(year - 1)}><ChevronLeft size={17}/></button><b>{year}</b><button className="icon-button" aria-label="Следующий год" disabled={year >= Number(today.slice(0, 4)) + 10} onClick={() => setYear(year + 1)}><ChevronRight size={17}/></button></div>
        </div>
      </div>
      {view === 'month' && <div className="month-list">{months.map(value => <button className="button quiet" key={value} aria-pressed={month === value} onClick={() => setMonth(value)}>{monthName(`${year}-${value}-01`).slice(0, 3)}</button>)}</div>}
      {view === 'year' && <div className="calendar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={totals}><CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4"/><XAxis dataKey="label" stroke="var(--muted)" axisLine={false} tickLine={false} fontSize={12}/><YAxis width={60} stroke="var(--muted)" axisLine={false} tickLine={false} tickFormatter={compact} fontSize={12}/><Tooltip formatter={(value: number) => [rub(value), 'Поступления']} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)', borderRadius: 10 }}/><Bar dataKey="value" fill="#8398ff" radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></div>}
      <div className="calendar-total"><span>Всего за период</span><strong>{rub(flows.reduce((sum, flow) => sum + flow.amount, 0))}</strong></div>
    </section>
    <section className="panel payouts">
      <div className="panel-heading"><div><h2>Операции</h2><p>Валовые суммы в рублях по условным курсам</p></div></div>
      {flows.length ? <div className="table-scroll"><table><thead><tr><th>Дата</th><th>Инструмент</th><th>Тип</th><th className="numeric">Сумма</th></tr></thead>
        <tbody>{flows.map(flow => <tr key={`${flow.assetId}-${flow.date}-${flow.type}`}><td>{shortDate(flow.date)}</td><td>{flow.name}</td><td><span className="soft-badge">{flow.type}</span></td><td className="numeric green-text">+{rub(flow.amount)}</td></tr>)}</tbody>
      </table></div> : <p className="empty">На этот период выплаты не запланированы.</p>}
    </section>
  </div>
}
