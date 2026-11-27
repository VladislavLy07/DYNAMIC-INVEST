import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { daysBetween } from '../finance/engine'
import { projectLedger } from '../finance/ledger'
import { cagr, maximumDrawdown, xirr } from '../finance/returns'
import type { FxRates } from '../finance/model'
import { available, type Portfolio } from '../portfolio/workspace'
import { assumptions, scenarioFields, scenarioNames, type ScenarioInput, type ScenarioName, type ScenarioYear } from '../features/scenarios'
import { compact, percent, rub } from './format'

const chartColors = ['#0055b8', '#16866a', '#c83d4b', '#8d5bc1', '#be7e2d']
export function ScenarioEditor({ active, scenarios, edit, firstYear }: { firstYear: number; active: ScenarioName; scenarios: Record<ScenarioName, ScenarioInput>; edit: (key: ScenarioName, value: ScenarioInput) => void }) {
  const [selected, setSelected] = useState<ScenarioName>(active)
  const [year, setYear] = useState(firstYear)
  const scenario = scenarios[selected]
  const annual = scenario.annual ?? {}
  const fields = scenarioFields
  const createAnnual = () => Object.fromEntries(fields.map(([key]) => [key, scenario[key]])) as ScenarioYear
  return <section className="panel feature-panel"><div className="panel-heading"><div><h2>Параметры экономических сценариев</h2><p>Базовые допущения и годовые переопределения. Вклады сохраняют договорную ставку.</p></div><select aria-label="Редактируемый сценарий" className="compact-select" value={selected} onChange={e => setSelected(e.target.value as ScenarioName)}>{scenarioNames.map(name => <option key={name}>{name}</option>)}</select></div>
    <div className="field-grid scenario-fields">{fields.map(([key, label, low, high]) => <label key={key}>{label}<span className="range-control"><input type="range" min={low} max={high} step=".5" value={scenario[key]} onChange={e => edit(selected, { ...scenario, [key]: Number(e.target.value) })}/><output>{scenario[key]}</output></span></label>)}</div>
    <div className="check-list"><label><input type="checkbox" checked={scenario.early} onChange={e => edit(selected, { ...scenario, early: e.target.checked })}/> Закрыть вклады в конце горизонта по указанным досрочным условиям</label></div>
    <details className="contract-fields"><summary>Параметры по календарным годам ({Object.keys(annual).length})</summary>
      <div className="toolbar wrap"><label>Год сценария<select value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 31 }, (_, i) => firstYear + i).map(value => <option key={value}>{value}</option>)}</select></label>
        <button className="button quiet" disabled={!!annual[year]} onClick={() => edit(selected, { ...scenario, annual: { ...annual, [year]: createAnnual() } })}>Добавить параметры года</button>
        {annual[year] && <button className="button quiet" onClick={() => edit(selected, { ...scenario, annual: Object.fromEntries(Object.entries(annual).filter(([key]) => Number(key) !== year)) })}>Вернуть базовые параметры</button>}
      </div>
      {annual[year] && <div className="field-grid scenario-fields">{fields.map(([key, label, min, max]) => <label key={key}>{label} · {year}<input type="number" min={min} max={max} step=".1" value={annual[year][key]} onChange={e => {
        const value = e.target.valueAsNumber
        if (Number.isFinite(value)) edit(selected, { ...scenario, annual: { ...annual, [year]: { ...annual[year], [key]: Math.min(max, Math.max(min, value)) } } })
      }}/></label>)}</div>}
      <p className="secondary">Курсовые шоки задают уровень к входному курсу, без сложения между годами. Для незаданных лет применяются базовые параметры. Прогнозный налог остаётся условным.</p>
    </details>
  </section>
}

export function StrategyView({ portfolios, active, scenarios, selected, fx, today, months }: {
  portfolios: Portfolio[]; active: Portfolio; scenarios: Record<ScenarioName, ScenarioInput>; selected: ScenarioName; fx: FxRates; today: string; months: number
}) {
  const [mode, setMode] = useState<'scenario' | 'portfolio'>('scenario')
  const [selectedIds, setSelectedIds] = useState<string[]>(portfolios.slice(0, 5).map(p => p.id))
  const records = useMemo(() => {
    const variants = mode === 'scenario' ? scenarioNames.map(name => ({ name, portfolio: active, scenario: scenarios[name] }))
      : portfolios.filter(p => selectedIds.includes(p.id)).slice(0, 5).map(p => ({ name: p.name, portfolio: p, scenario: scenarios[selected] }))
    return variants.map(({ name, portfolio, scenario }, i) => {
      const result = projectLedger(portfolio.assets, fx, today, months, available(portfolio), assumptions(scenario, portfolio, fx))
      const external = result.events.filter(e => ['withdrawal', 'contribution'].includes(e.type)).map(e => ({ date: e.date, amount: e.type === 'withdrawal' ? e.rubles : -e.rubles }))
      const irr = xirr([{ date: today, amount: -result.opening }, ...external, { date: result.end, amount: result.final.value }])
      return { name, portfolio, result, irr, i, cagr: external.length ? null : cagr(result.opening, result.final.value, daysBetween(today, result.end)),
        drawdown: external.length ? null : maximumDrawdown(result.points.map(p => p.value)) }
    })
  }, [active, fx, mode, months, portfolios, scenarios, selected, selectedIds, today])
  const data = records[0]?.result.points.map(({ date }, i) => ({ date, ...Object.fromEntries(records.map(item => [item.i, item.result.points[i].value])) })) ?? []
  return <section className="panel feature-panel stack">
    <div className="panel-heading"><div><h2>Сравнение траекторий</h2><p>{months} мес. · номинальный капитал · прогноз</p></div><div className="segmented"><button aria-pressed={mode === 'scenario'} onClick={() => setMode('scenario')}>Сценарии</button><button aria-pressed={mode === 'portfolio'} onClick={() => setMode('portfolio')}>Портфели</button></div></div>
    {mode === 'portfolio' && <div className="filter-row">{portfolios.map(p => <label className="inline-field" key={p.id}><input type="checkbox" checked={selectedIds.includes(p.id)} disabled={selectedIds.length >= 5 && !selectedIds.includes(p.id)} onChange={e => setSelectedIds(current => e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id))}/>{p.name}</label>)}</div>}
    {records.length ? <><div className="scenario-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 5"/><XAxis dataKey="date" tickFormatter={date => date.slice(0, 7)} stroke="var(--muted)" minTickGap={27} axisLine={false} tickLine={false}/><YAxis tickFormatter={compact} width={61} domain={['auto', 'auto']} stroke="var(--muted)" axisLine={false} tickLine={false}/><Tooltip formatter={(v: number) => rub(v)} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)' }}/>{records.map(item => <Line key={item.i} dataKey={String(item.i)} name={item.name} stroke={chartColors[item.i]} strokeWidth={2} dot={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>
      <div className="table-scroll"><table><thead><tr><th>Вариант</th><th>Начало</th><th>Итог</th><th>Валовая прибыль</th><th>Чистая прибыль</th><th>Выплаты</th><th>Налог</th><th>Комиссии</th><th>XIRR</th><th>CAGR</th><th>Реальная доходность</th><th>Просадка</th></tr></thead><tbody>{records.map(({ name, result, irr, cagr: growth, drawdown, i }) => <tr key={i}><td><b>{name}</b></td><td>{rub(result.opening)}</td><td>{rub(result.final.value)}</td><td>{rub(result.totals.gross)}</td><td>{rub(result.totals.net)}</td><td>{rub(result.totals.paid)}</td><td>{result.totals.assessed ? rub(result.totals.assessed) : '—'}</td><td>{rub(result.totals.fees)}</td><td>{irr.status === 'ok' ? percent(irr.rate) : irr.status === 'ambiguous' ? 'Неоднозначно' : '—'}</td><td>{growth === null ? '—' : percent(growth)}</td><td>{growth === null || !result.opening ? '—' : percent(result.final.real / result.opening - 1)}</td><td>{drawdown === null ? '—' : percent(drawdown)}</td></tr>)}</tbody></table></div></> : <p className="empty">Выберите портфели для сравнения.</p>}
    <p className="secondary">Просадка рассчитана по месячным точкам сценария. Без поправки на внешние потоки CAGR и просадка скрыты. Чистая прибыль учитывает только введённые комиссии и условный налог.</p>
  </section>
}
