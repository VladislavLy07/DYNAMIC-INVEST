import { useState } from 'react'
import { Info, SlidersHorizontal } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { projectScenario, scenarioDefaults, type Scenario } from '../finance/engine'
import { horizons, type Asset, type FxRates } from '../finance/model'
import { compact, rub } from './format'

const names = Object.keys(scenarioDefaults)
const colors = ['#8398ff', '#2cd7a4', '#f2a275']
const controls = [
  { key: 'keyRate', label: 'Изменение ключевой ставки, п.п.', min: -10, max: 10, step: 0.5 },
  { key: 'inflation', label: 'Годовая инфляция, %', min: -5, max: 30, step: 0.5 },
  { key: 'bondYield', label: 'Доходность облигаций, п.п.', min: -5, max: 5, step: 1 },
  { key: 'usd', label: 'Изменение USD/RUB, %', min: -50, max: 50, step: 1 },
  { key: 'cny', label: 'Изменение CNY/RUB, %', min: -50, max: 50, step: 1 },
  { key: 'spread', label: 'Кредитный спред, п.п.', min: -5, max: 10, step: 0.5 },
] as const

export function Scenarios({ assets, fx, today }: { assets: Asset[]; fx: FxRates; today: string }) {
  const [months, setMonths] = useState(12)
  const [selected, setSelected] = useState(names[0])
  const [scenarios, setScenarios] = useState(scenarioDefaults)
  const [reinvest, setReinvest] = useState(false)
  const [earlyExit, setEarlyExit] = useState(false)
  const [withdrawal, setWithdrawal] = useState(0)
  const [real, setReal] = useState(false)
  function adjust(key: keyof Scenario, value: number) {
    setScenarios(current => ({ ...current, [selected]: { ...current[selected], [key]: value } }))
  }
  const outcomes = names.map(name => projectScenario(assets, fx, today, months, scenarios[name], reinvest, earlyExit, withdrawal))
  const data = Array.from({ length: months + 1 }, (_, month) => ({
    month,
    ...Object.fromEntries(names.map(name => {
      const result = projectScenario(assets, fx, today, month, scenarios[name], reinvest, month === months && earlyExit, month === months ? withdrawal : 0)
      return [name, real ? result.real : result.nominal]
    })),
  }))
  return <div className="stack">
    <div className="scenario-metrics">{names.map((name, index) => <section className="panel feature-panel" key={name}><h2 className="inline-icon"><span className="legend-dot" style={{ background: colors[index] }}/>{name}</h2><div className="large-result">{rub(real ? outcomes[index].real : outcomes[index].nominal)}</div><p className="secondary">{real ? 'В ценах на дату расчёта' : 'Номинальный капитал'}{outcomes[index].withdrawal > 0 && ` · изъято ${rub(outcomes[index].withdrawal)}`}</p></section>)}</div>
    <div className="two-column scenario-grid">
      <section className="panel feature-panel">
        <div className="panel-heading"><div><h2>Параметры сценариев</h2><p>Изменения применяются сразу</p></div><span className="tile blue"><SlidersHorizontal size={17}/></span></div>
        <div className="field-grid">
          <label>Редактируемый сценарий<select value={selected} onChange={e => setSelected(e.target.value)}>{names.map(name => <option key={name}>{name}</option>)}</select></label>
          <label>Горизонт<select value={months} onChange={e => setMonths(Number(e.target.value))}>{horizons.map(n => <option key={n} value={n}>{n < 12 ? `${n} мес.` : `${n / 12} г.`}</option>)}</select></label>
          {controls.map(({ key, label, min, max, step }) => <label key={key}>{label}<span className="range-control"><input type="range" min={min} max={max} step={step} value={scenarios[selected][key]} onChange={e => adjust(key, Number(e.target.value))}/><output>{scenarios[selected][key].toLocaleString('ru')}</output></span></label>)}
          <label className="full-width">Изъятие в конце срока, ₽<input type="number" min={0} max={1e12} value={withdrawal} onChange={e => setWithdrawal(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label>
        </div>
        <div className="check-list"><label><input type="checkbox" checked={reinvest} onChange={e => setReinvest(e.target.checked)}/> Реинвестировать выплаты</label><label><input type="checkbox" checked={earlyExit} onChange={e => setEarlyExit(e.target.checked)}/> Закрыть вклады досрочно в конце срока</label></div>
      </section>
      <section className="panel feature-panel">
        <div className="panel-heading"><div><h2>Сравнение траекторий</h2><p>Капитал за {months} мес.</p></div><div className="segmented"><button aria-pressed={!real} onClick={() => setReal(false)}>Номинал</button><button aria-pressed={real} onClick={() => setReal(true)}>Реальная</button></div></div>
        <div className="scenario-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4"/><XAxis dataKey="month" tickFormatter={m => `${m} мес.`} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false}/><YAxis domain={['auto', 'auto']} width={62} tickFormatter={compact} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false}/><Tooltip labelFormatter={m => `${m} мес.`} formatter={(v: number) => rub(v)} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)', borderRadius: 10 }}/>{names.map((name, i) => <Line key={name} dataKey={name} stroke={colors[i]} strokeWidth={2} dot={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>
      </section>
    </div>
    <section className="panel feature-panel methodology"><h2><Info size={18}/> Допущения модели</h2><p>Валютный шок применяется сразу. Изменение ключевой ставки влияет на доход накопительных счетов и на условную ставку реинвестирования 8 % годовых плюс шок. Облигации переоцениваются линейно по приближённой дюрации, кредитный спред учитывается для облигаций кроме ОФЗ. После погашения основной капитал остаётся в деньгах.</p><p>При досрочном закрытии вклада в конце горизонта весь его процентный доход обнуляется. Изъятие ограничено доступным капиталом. Модель использует постоянные ставки и не учитывает комиссии, налоги и изменение цен акций.</p></section>
  </div>
}
