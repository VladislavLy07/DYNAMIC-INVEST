import { useMemo, useState } from 'react'
import { ArrowUpRight, Database, Search } from 'lucide-react'
import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { availableAt, indicators, type Indicator, type Snapshot } from '../market/snapshot'
import { compact, shortDate } from './format'

export const metricValue = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
const keys = Object.keys(indicators) as Indicator[]
const highlight: Indicator[] = ['key', 'inflation', 'USD', 'CNY', 'gold']

export function MarketBrief({ data, date, error }: { data?: Snapshot; date: string; error: string }) {
  return <section className="panel feature-panel market-brief">
    <div className="panel-heading"><div><h2>Экономика и рынки</h2><p>Банк России · официальные данные</p></div><a className="icon-button" href="#market" aria-label="Открыть экономику и рынки"><ArrowUpRight size={19}/></a></div>
    {error && <p className="form-error" role="status">{error}</p>}
    {highlight.map(key => {
      const series = data?.sources[key]
      const item = availableAt(series, date)
      return <div className="market-line" key={key}><div><b>{indicators[key].title}</b><small>{item ? shortDate(item.date) : 'Нет наблюдения'}</small></div><strong>{item ? metricValue(item.value) + (key === 'key' || key === 'inflation' ? ' %' : ' ₽') : '—'}</strong></div>
    })}
  </section>
}

export function MarketViews({ data, date, error, archive = false }: { data?: Snapshot; date: string; error: string; archive?: boolean }) {
  const [id, setId] = useState<Indicator>('key')
  const series = data?.sources[id]
  const year = date.slice(0, 4)
  const points = useMemo(() => (series?.series ?? []).filter(point => archive ? point.date.startsWith(year) && point.date <= date : point.date <= date), [series, archive, date, year])
  const latest = availableAt(series, date)
  return <div className="stack">
    {error && <p className="notice" role="status">{error}</p>}
    <div className="metric-grid market-metrics">{highlight.map(key => {
      const observation = availableAt(data?.sources[key], date)
      return <article className="panel metric" key={key}><div className="metric-heading">{indicators[key].title}</div><div className="metric-value">{observation ? metricValue(observation.value) : '—'}</div><div className="metric-note">{observation ? `${indicators[key].unit} · ${observation.date}` : 'Нет данных на дату'}</div></article>
    })}</div>
    <section className="panel feature-panel">
      <div className="panel-heading"><div><h2>{archive ? 'Исторический ряд' : 'История показателя'}</h2><p>{latest ? `Последнее доступное наблюдение · ${latest.date} · ${metricValue(latest.value)} ${indicators[id].unit}` : 'Ряд пока недоступен'}</p></div>
        <label className="compact-control"><span>Показатель</span><select value={id} onChange={e => setId(e.target.value as Indicator)}>{keys.map(key => <option key={key} value={key}>{indicators[key].title}</option>)}</select></label></div>
      {points.length > 0 ? <div className="market-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}>
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 5"/><XAxis dataKey="date" minTickGap={28} tickFormatter={raw => raw.slice(0, 7)} tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={12}/><YAxis tickFormatter={compact} domain={['auto', 'auto']} tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={12}/>
        <Tooltip formatter={(value: number) => [metricValue(value), indicators[id].unit]} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)' }}/><Line dataKey="value" type={id === 'key' ? 'stepAfter' : 'linear'} stroke="var(--accent-chart)" strokeWidth={2} isAnimationActive={false} dot={false}/>{points.length > 25 && <Brush dataKey="date" height={22} stroke="#4285D9" travellerWidth={8} tickFormatter={raw => raw.slice(0, 7)}/>}
      </LineChart></ResponsiveContainer></div> : <p className="empty">Для выбранного периода источник не предоставил наблюдений.</p>}
      {series && <p className="secondary">Наблюдений в выборке: {points.length}. Последняя попытка: {series.lastAttempt.slice(0, 16).replace('T', ' ')} UTC. <a className="text-link" href={series.source} target="_blank" rel="noreferrer">Официальный источник</a></p>}
      {id === 'gold' && <p className="secondary">Учётная цена ЦБ в рублях за грамм. Цена конкретного продукта зависит от его условий.</p>}
    </section>
    <DataQuality data={data}/>
  </div>
}

export function DataQuality({ data }: { data?: Snapshot }) {
  const stamp = data?.collectedAt
  const next = stamp ? new Date(Date.parse(stamp.slice(0, 10)) + 86400000 + 4 * 3600000 + 37 * 60000).toISOString().slice(0, 16).replace('T', ' ') : null
  return <section className="panel feature-panel">
    <div className="panel-heading"><div><h2>Качество данных</h2><p>{stamp ? `Снимок ${stamp.slice(0, 16).replace('T', ' ')} UTC · следующий слот после снимка ${next} UTC` : 'Снимок ещё не загружен'}</p></div><span className="tile blue"><Database size={16}/></span></div>
    {data && <div className="table-scroll quality-table"><table><thead><tr><th>Ряд</th><th>Статус источника</th><th>Покрытие</th><th>Проверено UTC</th><th className="numeric">Записей / новых</th></tr></thead><tbody>{keys.map(key => {
      const info = data.sources[key]
      const first = info?.series[0], last = info?.series.at(-1)
      const limit = key === 'inflation' ? 65 : 7
      const stale = last && Date.now() - Date.parse(last.date) > limit * 86400000
      const status = info?.status === 'review' ? 'Требуется проверка' : info?.status === 'unavailable' ? 'Источник недоступен' : stale ? 'Устарело' : info ? 'Подтверждённый ряд' : 'Нет данных'
      return <tr key={key}><td>{info ? <a href={info.source} className="text-link" target="_blank" rel="noreferrer">{indicators[key].title}</a> : indicators[key].title}</td><td><span className="soft-badge">{status}</span>{info?.errors.length ? <details><summary className="secondary">История ошибок</summary>{[...info.errors].reverse().map((e, i) => <p className="secondary" key={i}>{e.date.slice(0, 16)} · {e.message}</p>)}</details> : null}</td><td>{first && last ? first.date + ' – ' + last.date : '—'}</td><td>{info?.lastSuccess?.slice(0, 16).replace('T', ' ') ?? '—'}</td><td className="numeric">{info ? `${info.series.length} / ${info.changes}` : '—'}</td></tr>
    })}</tbody></table></div>}
  </section>
}

export function SourceDirectory({ openEditor }: { openEditor: () => void }) {
  const [query, setQuery] = useState('')
  const sources = [
    { name: 'ПСБ · Вклады и счета', url: 'https://www.psbank.ru/personal/saving/vklady-s-popolneniem', kind: 'Банковские продукты', status: 'HTTP 503 при проверке 27.11.2026' },
    { name: 'Токеон · Выпуски ЦФА', url: 'https://tokeon.ru/vypuski/dfa', kind: 'Цифровые финансовые активы', status: 'Официальная витрина' },
    { name: 'Московская биржа · ISS', url: 'https://www.moex.com/', kind: 'Облигации и фонды', status: 'HTTP 503 на ISS при проверке 27.11.2026' },
    { name: 'Банк России · Учётные цены', url: 'https://www.cbr.ru/hd_base/metall/metall_base_new/', kind: 'Драгоценные металлы', status: 'Официальный ориентир' },
  ].filter(record => (record.name + record.kind).toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="stack">
    <section className="panel feature-panel stack">
      <div className="panel-heading"><div><h2>Источники финансовых продуктов</h2><p>Подтверждённые тарифы пока отсутствуют в каталоге. Договорные параметры можно добавить вручную.</p></div><button className="button primary" onClick={openEditor}>Добавить инструмент</button></div>
      <label className="source-search"><Search size={18}/><input aria-label="Поиск источника" placeholder="Поиск по организации и типу инструмента" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <div className="source-grid">{sources.map(item => <article key={item.url} className="source-card"><p>{item.kind}</p><h3>{item.name}</h3><span className="soft-badge">{item.status}</span><a href={item.url} target="_blank" rel="noreferrer" className="text-link">Официальная страница <ArrowUpRight size={15}/></a></article>)}</div>
      {!sources.length && <p className="empty">Источники по запросу не найдены.</p>}
    </section>
  </div>
}
