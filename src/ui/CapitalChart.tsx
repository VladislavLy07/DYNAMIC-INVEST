import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { projectLedger } from '../finance/ledger'
import { compact, rub, shortDate } from './format'

export type Projection = ReturnType<typeof projectLedger>
export const displayMoney = (amount: number, unit = 'RUB', rate = 1) => unit === 'RUB' ? rub(amount) : new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: unit, maximumFractionDigits: 0,
}).format(amount / rate)

type Metric = 'value' | 'real' | 'gross' | 'net'
const metrics: { key: Metric; name: string }[] = [
  { key: 'value', name: 'Капитал' }, { key: 'real', name: 'В реальных ценах' },
  { key: 'gross', name: 'Валовой доход' }, { key: 'net', name: 'Чистый доход' },
]

export function CapitalChart({ projection, unit, rate }: { projection: Projection; unit: string; rate: number }) {
  const [metric, setMetric] = useState<Metric>('value')
  const [granularity, setGranularity] = useState<'month' | 'year'>('month')
  const data = granularity === 'year' ? projection.points.filter((_, index) => index % 12 === 0 || index === projection.points.length - 1) : projection.points
  return <section className="panel chart-panel capital-chart">
    <div className="panel-heading"><div><h2>Динамика капитала</h2><p>Прогноз · {data[0].date} – {projection.end}</p></div>
      <label className="compact-control"><span>Шаг графика</span><select value={granularity} onChange={e => setGranularity(e.target.value as 'month' | 'year')}><option value="month">Месяц</option><option value="year">Год</option></select></label>
    </div>
    <div className="chart-control"><div className="segmented" aria-label="Показатель графика">{metrics.map(item => <button key={item.key} aria-pressed={metric === item.key} onClick={() => setMetric(item.key)}>{item.name}</button>)}</div></div>
    <div className="chart-large" role="img" aria-label="График прогнозной траектории капитала">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <defs><linearGradient id="wealth-curve" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4285D9" stopOpacity={0.32}/><stop offset="100%" stopColor="#4285D9" stopOpacity={0.02}/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 5"/>
          <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={24} tickFormatter={date => granularity === 'year' ? date.slice(0, 4) : shortDate(date)} stroke="var(--muted)" fontSize={12}/>
          <YAxis width={67} domain={['auto', 'auto']} axisLine={false} tickLine={false} tickMargin={8} tickFormatter={value => compact(value / rate)} stroke="var(--muted)" fontSize={12}/>
          <Tooltip labelFormatter={date => shortDate(date)} formatter={(value: number) => [displayMoney(value, unit, rate), metrics.find(m => m.key === metric)?.name]} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)', borderRadius: 10 }}/>
          <Area type="linear" dataKey={metric} stroke="var(--accent-chart)" strokeWidth={2.5} fill="url(#wealth-curve)" strokeDasharray="6 3" isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
}
