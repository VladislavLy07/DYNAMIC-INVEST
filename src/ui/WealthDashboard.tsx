import type { ReactNode } from 'react'
import { ArrowUpRight, ChevronDown, CircleDollarSign, Waves } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { concentration, typesForPortfolio, type WealthMetrics } from '../analytics/wealth'
import type { Portfolio } from '../portfolio/workspace'
import { productVersions } from '../market/catalog'
import type { Snapshot } from '../market/snapshot'
import type { FxRates } from '../finance/model'
import { CapitalChart, displayMoney, type Projection } from './CapitalChart'
import { Upcoming, YearlyLedger } from './LedgerViews'
import { MarketBrief } from './MarketViews'
import { percent } from './format'

const colors = ['#0055b8', '#488ee3', '#56b8d2', '#19396c', '#27a789', '#9bb5dc', '#8969b9']
const brand = import.meta.env.BASE_URL + 'brand/'

export function WealthDashboard({ portfolio, metrics, projection, market, error, today, fx, unit, watermark, future, scenario, presentation, investmentPreview }: {
  portfolio: Portfolio; metrics: WealthMetrics; projection: Projection; market?: Snapshot; error: string; today: string; fx: FxRates; unit: keyof FxRates; watermark: boolean; future: boolean; scenario: string; presentation: boolean; investmentPreview: ReactNode
}) {
  const format = (value: number) => displayMoney(value, unit, fx[unit])
  const allocation = typesForPortfolio(portfolio, fx)
  const largest = concentration(portfolio, fx).issuers[0]
  const latestProducts = productVersions.filter(p => p.issuer === 'ПСБ').sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, 2)
  return <div className="stack">
    <section className="white-overview">
      {watermark && <img className="white-monogram" src={brand + 'monogram.svg'} alt=""/>}
      <div className="white-overview-copy">
        <h1>Обзор капитала</h1>
        <p>{portfolio.demo ? 'Демонстрационный портфель' : portfolio.name}</p>
      </div>
      <dl className="white-overview-values">
        <div><dt>{future ? 'Капитал к концу горизонта' : 'Текущая стоимость'}</dt><dd>{format(future ? projection.final.value : metrics.capital)}</dd></div>
        <div><dt>Ликвидный резерв</dt><dd>{format(metrics.reserve)}</dd></div>
        <div><dt>Прогноз за 12 месяцев</dt><dd>{metrics.annualYield === null ? '—' : percent(metrics.annualYield)}</dd></div>
      </dl>
      <a href="#portfolio" className="text-link overview-link">Управление капиталом <ArrowUpRight size={16}/></a>
    </section>
    {!presentation && investmentPreview}
    <details className="overview-details" open={presentation || undefined}>
      <summary>Аналитика портфеля <ChevronDown size={18}/></summary>
      <div className="stack">
        <div className="dashboard-grid"><CapitalChart projection={projection} unit={unit} rate={fx[unit]}/><MarketBrief date={today} data={market} error={error}/></div>
        <div className="two-column">
          <section className={'panel feature-panel allocation-panel' + (watermark ? ' watermarked' : '')}>
            <div className="panel-heading"><div><h2>Структура капитала</h2><p>Классы активов по текущей оценке</p></div><span className="tile blue"><Waves size={19}/></span></div>
            {allocation.length ? <div className="allocation-content"><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocation} dataKey="value" nameKey="name" innerRadius={47} outerRadius={68} stroke="none" paddingAngle={2} isAnimationActive={false}>{allocation.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]}/>)}</Pie><Tooltip formatter={(val: number) => format(val)} contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)' }}/></PieChart></ResponsiveContainer><div className="donut-label"><strong>{allocation.length}</strong><span>классов</span></div></div><ul className="legend">{allocation.map((item, index) => <li key={item.name}><span className="legend-dot" style={{ background: colors[index % colors.length] }}/><span>{item.name}</span><b>{percent(item.value / metrics.capital)}</b></li>)}</ul></div> : <p className="empty">Добавьте актив или внесите бюджет.</p>}
          </section>
          <Upcoming projection={projection}/>
        </div>
        <section className="panel feature-panel">
          <div className="panel-heading"><div><h2>Результаты и ограничения</h2><p>{scenario} сценарий · прогноз на выбранный горизонт</p></div><span className="tile green"><CircleDollarSign size={19}/></span></div>
          <dl className="ledger-summary">{[
            ['Первоначальный капитал', format(portfolio.budget)], ['Работающий капитал', format(metrics.working)],
            ['Средний прогноз выплат в месяц', format(metrics.monthlyPaid)], ['Свободный капитал', format(metrics.free)], ['Валовая прибыль', format(projection.totals.gross)],
            ['Чистая прибыль', format(projection.totals.net)], ['Полученный доход', 'Нет подтверждённых выплат'],
            ['Нереализованная прибыль по оценке', format(metrics.unrealized)], ['Налоговые обязательства', projection.totals.assessed ? format(projection.totals.assessed) + ' · сценарий' : 'Не оценены'],
            ['Введённые комиссии', format(projection.totals.fees)], ['Реальная доходность', metrics.realYield === null ? '—' : percent(metrics.realYield)],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {largest && metrics.capital > 0 && <p className="secondary">Концентрация по крупнейшему эмитенту «{largest[0]}» составляет {percent(largest[1] / metrics.capital)} текущей стоимости.</p>}
          {projection.warnings.map(w => <p className="secondary" key={w}>{w}</p>)}
          <p className="secondary">Капитал рассчитан по введённым оценкам. Денежный доход и переоценка показаны отдельно. <a className="text-link" href="#tax">Рассчитать налог на банковский доход</a></p>
        </section>
        <YearlyLedger projection={projection}/>
        <section className="panel feature-panel"><div className="panel-heading"><div><h2>Последние добавленные банковские публикации</h2><p>Датированные источники из архива</p></div><a href="#archive" className="button quiet">Архив продуктов</a></div>
          {latestProducts.map(item => <div className="market-line" key={item.versionId}><div><b>{item.name}</b><small>{item.observedAt} · ПСБ</small></div><a className="text-link" href={item.source} target="_blank" rel="noreferrer">Публикация банка</a></div>)}
        </section>
      </div>
    </details>
  </div>
}

export function HistoricalHome({ data, date, error }: { data?: Snapshot; date: string; error: string }) {
  return <div className="stack"><section className="panel feature-panel"><h2>Рынки на {date}</h2><p className="secondary">Исторический режим показывает наблюдения источников. Сохранённые позиции и договорные ставки портфелей доступны в разделе «Капитал».</p><a href="#archive" className="button quiet">Исследовать архив</a></section><MarketBrief date={date} data={data} error={error}/></div>
}
