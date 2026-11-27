import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { compareDeposits, type ChinaInputs } from '../features/china'
import { availableAt, type Snapshot } from '../market/snapshot'
import { compact, percent, rub } from './format'

const fields = [
  ['capital', 'Исходный капитал, ₽', 1, 1e12], ['days', 'Срок, дней', 1, 1826], ['rubRate', 'Рублёвая ставка, %', 0, 100], ['cnyRate', 'Юаневая ставка, %', 0, 100],
  ['exitShift', 'Изменение CNY/RUB к выходу, %', -99, 300], ['spread', 'Надбавка при покупке и скидка при продаже, %', 0, 30],
  ['rubInterestTax', 'Условный налог на проценты RUB, %', 0, 100], ['cnyInterestTax', 'Условный налог на проценты CNY, %', 0, 100],
] as const

export function ChinaLab({ data, date }: { data?: Snapshot; date: string }) {
  const series = data?.sources.CNY
  const observation = availableAt(series, date)
  const fresh = observation && date <= (data?.collectedAt.slice(0, 10) ?? '') && Date.parse(date) - Date.parse(observation.date) <= 7 * 86400000
  const [fx, setFx] = useState('')
  const [inputs, setInputs] = useState<Omit<ChinaInputs, 'entryFx'>>({ capital: 1e6, days: 365, rubRate: 10, cnyRate: 3, exitShift: 0, spread: 1, rubInterestTax: 0, cnyInterestTax: 0 })
  const rate = fx !== '' ? Number(fx) : fresh ? observation.value : undefined
  const result = rate === undefined ? null : compareDeposits({ ...inputs, entryFx: rate })
  const points = result ? Array.from({ length: 17 }, (_, i) => {
    const change = Math.max(-99, inputs.exitShift - 20) + i * 2.5
    const comparison = compareDeposits({ ...inputs, entryFx: rate!, exitShift: change })
    return { change, difference: comparison?.difference }
  }).filter(p => p.difference !== undefined) : []
  return <div className="stack">
    <div className="two-column">
      <section className="panel feature-panel stack">
        <div className="panel-heading"><div><h2>Russia–China Investment Lab</h2><p>Сравнение размещений в рублях и юанях при одном сроке.</p></div></div>
        <div className="field-grid export-fields">
          <label>Курс входа, ₽ за CNY<input type="number" min=".000001" step=".0001" placeholder={fresh ? String(observation.value) : 'Укажите курс'} value={fx} onChange={e => setFx(e.target.value)}/></label>
          {fields.map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} step={key === 'days' ? 1 : '.1'} value={inputs[key]} onChange={e => setInputs({ ...inputs, [key]: e.target.valueAsNumber || 0 })}/></label>)}
        </div>
        <p className="secondary">{fx !== '' ? 'Используется введённый курс.' : fresh ? `Официальный курс Банка России от ${observation.date}.` : 'За выбранный период курс недоступен. Можно ввести допущение.'} Ставки размещения — сценарные параметры.</p>
        {series && <a className="text-link" href={series.source} rel="noreferrer" target="_blank">Ряд CNY/RUB Банка России</a>}
      </section>
      <section className="panel feature-panel stack" aria-live="polite"><h2>Эквивалент на дату выхода</h2>
        {result ? <dl className="result-list">{[
          ['Рублёвый инструмент', rub(result.rubFinal)], ['Юаневый инструмент', result.cnyFinal.toLocaleString('ru-RU') + ' CNY'],
          ['Юаневый инструмент после обратного обмена', rub(result.rubEquivalent)], ['Разница', rub(result.difference)],
          ['Безубыточный официальный курс', result.breakEvenFx.toFixed(4) + ' ₽'], ['Сдвиг для равенства результатов', percent(result.breakEvenFx / rate! - 1)],
          ['Курсы покупки / продажи с учётом спреда', result.buyFx.toFixed(4) + ' / ' + result.sellFx.toFixed(4) + ' ₽'],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p className="notice">Проверьте курс, капитал, срок и диапазоны ставок.</p>}
        <p className="secondary">Простые проценты ACT/365. Условный налог вычитается из процентов в валюте размещения, спред применяется при каждом обмене. НДФЛ от обмена валюты и специальные правила валютных вкладов требуют отдельного расчёта.</p>
      </section>
    </div>
    {result && <section className="panel feature-panel"><h2>Чувствительность к курсу</h2><p className="secondary">Разница в рублях между юаневой и рублёвой стратегиями</p>
      <div className="chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={points}><CartesianGrid vertical={false} stroke="var(--grid)"/><XAxis dataKey="change" tickFormatter={value => value + '%'} fontSize={12}/><YAxis tickFormatter={compact} width={77} fontSize={12}/><Tooltip formatter={(value: number) => [rub(value), 'Разница']}/><Area dataKey="difference" fill="#4285d930" stroke="var(--accent-chart)" isAnimationActive={false}/><ReferenceDot x={inputs.exitShift} y={result.difference} r={4}/></AreaChart></ResponsiveContainer></div>
    </section>}
  </div>
}
