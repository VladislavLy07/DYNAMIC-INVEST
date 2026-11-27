import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { publicInstruments, readReplay, replayPortfolio, type ReplaySpec } from '../backtest/replay'
import type { Snapshot } from '../market/snapshot'
import { csv, downloadFile } from '../reporting/files'
import { compact, percent, rub } from './format'

const weights = ['gold', 'USD', 'CNY', 'EUR'] as const
const eventLabel = { buy: 'Покупка', sell: 'Продажа', contribution: 'Пополнение', withdrawal: 'Вывод', income: 'Выплата', fee: 'Комиссия', tax: 'Налог' }

export function PortfolioReplay({ data, date }: { data?: Snapshot; date: string }) {
  const [start, setStart] = useState(date.slice(0, 4) + '-01-01')
  const [capital, setCapital] = useState(1_000_000)
  const [allocation, setAllocation] = useState({ gold: 40, USD: 20, CNY: 20, EUR: 0 })
  const [spec, setSpec] = useState<ReplaySpec | null>(null)
  const [error, setError] = useState('')
  const [gap, setGap] = useState(14)
  const [result, setResult] = useState<{ replay: ReturnType<typeof replayPortfolio>; start: string; end: string }>()
  const file = useRef<HTMLInputElement>(null)
  const model = (): ReplaySpec => spec ?? { version: 1, capital, holdings: weights.filter(asset => allocation[asset] > 0).map(asset => ({ asset, weight: allocation[asset] })), events: [], quotes: {} }
  function calculate() {
    setResult(undefined)
    try { setResult({ replay: replayPortfolio(model(), start, date, data, gap), start, end: date }); setError('') }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось выполнить расчёт.') }
  }
  async function load(input: File | undefined) {
    if (!input) return
    setResult(undefined)
    try {
      if (input.size > 1_500_000) throw new Error('Максимальный размер файла — 1,5 МБ.')
      setSpec(readReplay(await input.text())); setError('')
    } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось прочитать журнал.') }
  }
  const awaitingQuotes = !data && !spec && weights.some(asset => allocation[asset] > 0)
  const sample = result && result.end === date ? result.replay : undefined
  const values = sample && sample.rows.length > 370 ? sample.rows.filter((_, i) => i % 7 === 0 || i === sample.rows.length - 1) : sample?.rows
  return <section className="panel feature-panel stack">
    <div className="panel-heading"><div><h2>Историческая симуляция портфеля</h2><p>Дневная переоценка в рублях, журнал сделок и внешних потоков. Конец периода · {date}</p></div></div>
    <div className="field-grid portfolio-fields">
      <label>Начало портфельного периода<input type="date" max={date} value={start} onChange={e => { setStart(e.target.value); setResult(undefined) }}/></label>
      <label>Максимальный пропуск котировок, дн.<input type="number" min={0} max={31} value={gap} onChange={e => { setGap(e.target.valueAsNumber || 0); setResult(undefined) }}/></label>
      {!spec && <label>Стартовый капитал, ₽<input type="number" min={1} max={1e12} value={capital} onChange={e => { setCapital(e.target.valueAsNumber || 0); setResult(undefined) }}/></label>}
      {!spec && weights.map(asset => <label key={asset}>{publicInstruments[asset]} · доля, %<input type="number" min={0} max={100} step=".01" value={allocation[asset]} onChange={e => { setAllocation({ ...allocation, [asset]: e.target.valueAsNumber || 0 }); setResult(undefined) }}/></label>)}
    </div>
    {spec ? <p className="secondary">Капитал файла {rub(spec.capital)} · позиций {spec.holdings.length} · операций {spec.events.length} · пользовательских рядов {Object.keys(spec.quotes).length}</p> : <p className="secondary">Остаток весов сохраняется в рублях. Начальная покупка по ориентирам ЦБ условная. Результат не равен доходу банковского продукта.</p>}
    <div className="toolbar wrap">
      <button className="button primary" disabled={awaitingQuotes} onClick={calculate}>Рассчитать портфель</button>
      <button className="button quiet" onClick={() => file.current?.click()}><Upload size={15}/>Импорт журнала JSON</button>
      <input className="visually-hidden" aria-label="Файл исторического журнала" ref={file} type="file" accept=".json,application/json" onChange={e => { void load(e.target.files?.[0]); e.target.value = '' }}/>
      <button className="button quiet" onClick={() => downloadFile('dynamic-invest-replay.json', JSON.stringify(model(), null, 2), 'application/json')}><Download size={15}/>Скачать шаблон JSON</button>
      {spec && <button className="button quiet" onClick={() => { setSpec(null); setResult(undefined); setError('') }}>Сбросить импорт</button>}
    </div>
    {awaitingQuotes && <p role="status" className="secondary">Официальные ряды пока недоступны. Можно импортировать журнал с собственными котировками или задать портфель из рублей.</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {sample && <>
      <dl className="ledger-summary">{[
        ['Капитал на конец', rub(sample.final.value)], ['Чистый результат без внешних потоков', rub(sample.profit)],
        ['TWR', sample.twr === null ? '—' : percent(sample.twr)], ['XIRR', sample.xirr.status === 'ok' ? percent(sample.xirr.rate) : '—'],
        ['Максимальная просадка TWR', sample.drawdown === null ? '—' : percent(sample.drawdown)], ['Внешние взносы', rub(sample.contributed)], ['Внешние выводы', rub(sample.withdrawn)],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="chart-large" role="img" aria-label="Историческая траектория капитала"><ResponsiveContainer width="100%" height="100%"><AreaChart data={values}><CartesianGrid vertical={false} stroke="var(--grid)"/><XAxis dataKey="date" minTickGap={45} tickFormatter={value => value.slice(0, 7)} fontSize={12}/><YAxis tickFormatter={compact} width={76} fontSize={12}/><Tooltip formatter={(value: number) => [rub(value), 'Капитал']}/><Area dataKey="value" stroke="var(--accent-chart)" fill="#4285d930" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>
      <div><button className="button quiet" onClick={() => downloadFile('dynamic-invest-replay.csv', csv([['Дата', 'Капитал', 'Деньги', 'Индекс TWR'], ...sample.rows.map(row => [row.date, row.value, row.cash, row.index ?? ''])]), 'text/csv')}><Download size={15}/>Скачать дневные оценки</button></div>
      {sample.entries.length > 0 && <details><summary>Исполненные операции ({sample.entries.length})</summary><div className="table-scroll"><table><thead><tr><th>Дата</th><th>Действие</th><th>Инструмент</th><th>Денежный поток</th><th>Дата цены</th></tr></thead><tbody>{sample.entries.map((entry, i) => <tr key={i}><td>{entry.date}</td><td>{eventLabel[entry.type]}</td><td>{entry.asset || '—'}</td><td>{rub(entry.cashDelta)}</td><td>{entry.priceDate ?? '—'}</td></tr>)}</tbody></table></div></details>}
    </>}
    <p className="secondary">В файле можно задать собственные рублёвые котировки, даты их доступности, сделки, выплаты, комиссии, налоги и внешние потоки. Будущие данные и неподтверждённые пропуски блокируют расчёт.</p>
  </section>
}
