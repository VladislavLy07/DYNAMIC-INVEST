import { useState } from 'react'
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, BriefcaseBusiness, CalendarDays, ChevronRight, CircleDollarSign, LockKeyhole, Wallet } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, cashFlows, portfolioSummary, projectScenario, scenarioDefaults } from '../finance/engine'
import type { Asset, FxRates } from '../finance/model'
import { compact, monthName, percent, rub, shortDate } from './format'

const colors = ['#7a91ff', '#29d5a5', '#ad83fa', '#51b7f1', '#efb966', '#667488']
const periods = [3, 6, 12]

export function Dashboard({ assets, fx, today, openCalendar }: { assets: Asset[]; fx: FxRates; today: string; openCalendar: () => void }) {
  const [months, setMonths] = useState(12)
  const summary = portfolioSummary(assets, fx, today)
  const allocations = [...new Set(assets.map(a => a.kind))].map(kind => ({
    name: kind,
    value: assets.filter(a => a.kind === kind).reduce((sum, a) => sum + a.amount * fx[a.currency], 0),
  })).sort((a, b) => b.value - a.value)
  const projection = Array.from({ length: months + 1 }, (_, index) => {
    const result = projectScenario(assets, fx, today, index, scenarioDefaults.Базовый, false, false, 0)
    return { month: monthName(addMonths(today, index)).slice(0, 3), value: result.nominal }
  })
  const delta = summary.capital ? projection.at(-1)!.value / summary.capital - 1 : 0
  const upcoming = cashFlows(assets, fx, today, addMonths(today, 12)).slice(0, 4)
  const metrics = [
    { label: 'Совокупный капитал', value: rub(summary.capital), icon: Wallet, color: 'blue', note: `${assets.length} позиций` },
    { label: 'Работающий капитал', value: rub(summary.working), icon: BriefcaseBusiness, color: 'purple', note: `${percent(summary.capital ? summary.working / summary.capital : 0)} от капитала` },
    { label: 'Ликвидный резерв', value: rub(summary.reserve), icon: LockKeyhole, color: 'cyan', note: `${percent(summary.capital ? summary.reserve / summary.capital : 0)} от капитала` },
    { label: 'Денежный поток', value: rub(summary.annual), icon: ArrowDownLeft, color: 'green', note: 'На ближайшие 12 месяцев' },
    { label: 'Годовая доходность', value: percent(summary.yield), icon: Activity, color: 'green', note: 'Оценка до налогов' },
  ]
  return <>
    <div className="metric-grid">
      {metrics.map(({ label, value, icon: Icon, color, note }) => <article className="panel metric" key={label}>
        <div className="metric-heading"><span className={`tile ${color}`}><Icon size={17} /></span><span>{label}</span></div>
        <div className="metric-value">{value}</div><div className="metric-note">{note}</div>
      </article>)}
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h2>Динамика капитала</h2><p>Прогноз по текущему портфелю</p></div>
          <div className="segmented" aria-label="Горизонт прогноза">{periods.map(period => <button key={period} aria-pressed={months === period} onClick={() => setMonths(period)}>{period === 12 ? '1 год' : `${period} мес.`}</button>)}</div>
        </div>
        <div className="chart-headline"><strong>{rub(projection.at(-1)!.value)}</strong><span className="gain"><ArrowUpRight size={14} />{percent(delta)}</span></div>
        <div className="chart-large" aria-label="График прогнозной стоимости портфеля">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
              <defs><linearGradient id="capital-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8096ff" stopOpacity={0.38}/><stop offset="100%" stopColor="#8096ff" stopOpacity={0.01}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} minTickGap={15} stroke="var(--muted)" fontSize={12} />
              <YAxis width={60} axisLine={false} tickLine={false} tickMargin={9} domain={['auto', 'auto']} tickFormatter={compact} stroke="var(--muted)" fontSize={12} />
              <Tooltip formatter={(value: number) => [rub(value), 'Капитал']} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)', borderRadius: 10 }} />
              <Area type="linear" dataKey="value" stroke="#8398ff" strokeWidth={2.5} fill="url(#capital-fill)" activeDot={{ r: 5, stroke: 'var(--panel)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel allocation-panel">
        <div className="panel-heading"><div><h2>Структура активов</h2><p>Распределение по классам</p></div></div>
        {allocations.length ? <>
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={allocations} dataKey="value" nameKey="name" innerRadius={56} outerRadius={74} startAngle={90} endAngle={-270} paddingAngle={3} stroke="none">
                {allocations.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
              </Pie><Tooltip formatter={(value: number) => rub(value)} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)', borderRadius: 10 }} /></PieChart>
            </ResponsiveContainer>
            <div className="donut-label"><strong>{compact(summary.capital)} ₽</strong><span>Всего активов</span></div>
          </div>
          <ul className="legend">{allocations.map((entry, index) => <li key={entry.name}><span className="legend-dot" style={{ background: colors[index % colors.length] }} /><span>{entry.name}</span><b>{percent(entry.value / summary.capital)}</b></li>)}</ul>
        </> : <p className="empty">В портфеле пока нет активов.</p>}
      </section>
    </div>
    <section className="panel payouts">
      <div className="panel-heading"><div><h2>Ближайшие выплаты</h2><p>Ожидаемые поступления по портфелю</p></div><button className="button quiet" onClick={openCalendar}>Весь календарь <ArrowRight size={15}/></button></div>
      {upcoming.length ? <div className="table-scroll"><table>
        <thead><tr><th>Дата</th><th>Инструмент</th><th>Тип выплаты</th><th className="numeric">Поступление</th></tr></thead>
        <tbody>{upcoming.map(flow => <tr key={`${flow.assetId}-${flow.date}-${flow.type}`}>
          <td><span className="inline-icon"><CalendarDays size={15}/>{shortDate(flow.date)}</span></td>
          <td><span className="inline-icon strong">{flow.type === 'Проценты' ? <Banknote size={17}/> : <CircleDollarSign size={17}/>} {flow.name}</span></td>
          <td><span className="soft-badge">{flow.type}</span></td>
          <td className="numeric green-text">+{rub(flow.amount)} <ChevronRight className="row-chevron" size={14}/></td>
        </tr>)}</tbody>
      </table></div> : <p className="empty">В ближайшие 12 месяцев выплат нет.</p>}
    </section>
  </>
}
