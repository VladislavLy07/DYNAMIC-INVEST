import { useId, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react'
import { fundPeriodReturn, fundRates, fundScenario, instrumentScenario, scenarioLabels, slideHorizons, slideTaxYear, type SlideHorizon, type SlideInput, type TaxModel } from '../finance/miniSlides'
import { fundDisclosures, type FundDisclosure, type FundProfile, type FundWeight } from '../market/fundDisclosures'
import { instrumentSlides } from '../market/instrumentSlides'
import { securitiesSource } from '../tax/securities'
import { taxSource } from '../tax/deposits'

const percentage = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const pct = (value: number) => percentage.format(value)
const rub = (value: number) => money.format(value)
const duration: Record<SlideHorizon, string> = { 6: '6 месяцев', 12: '1 год', 24: '2 года', 36: '3 года', 60: '5 лет' }
const displayDate = (date: string) => date.split('-').reverse().join('.')

const annotations: Record<FundProfile, { income: string; risk: string }> = {
  cash: { income: 'Результат зависит от ставок денежного рынка и дохода по инструментам портфеля.', risk: 'Снижение ставок уменьшает будущий доход. Возможны кредитные и операционные потери.' },
  bonds: { income: 'Результат формируют купоны и переоценка облигаций.', risk: 'Рост рыночных ставок может снижать цены облигаций. Существует риск неисполнения обязательств эмитентом.' },
  mixed: { income: 'Результат формируют купоны, дивиденды и изменение цен бумаг.', risk: 'Стоимость пая чувствительна к рынку акций, процентным ставкам и качеству долга.' },
  shares: { income: 'Результат формируют динамика цен акций и дивиденды компаний.', risk: 'Просадки рынка и отдельных компаний могут уменьшить стоимость пая.' },
  fx: { income: 'Результат зависит от купонов, цен облигаций и валютной переоценки.', risk: 'Укрепление рубля может уменьшить рублёвый результат. Сохраняются кредитный и процентный риски.' },
  gold: { income: 'Основной источник результата — изменение стоимости золота.', risk: 'Колебания цены металла и курса рубля могут привести к убытку.' },
}

function Disclosure({ title, brief, heading, children }: {
  title: string
  brief: string
  heading?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panel = useId()
  return <article className="mini-product">
    <h3><button type="button" className="mini-toggle" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(value => !value)}>
      <span className="mini-identity"><strong>{title}</strong><span>{brief}</span></span>
      {heading}
      <ChevronDown className="mini-chevron" size={18} aria-hidden="true"/>
    </button></h3>
    <div id={panel} className="mini-slide" hidden={!open}>{open && children}</div>
  </article>
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return <details className="mini-detail"><summary>{title}</summary><div>{children}</div></details>
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="text-link" target="_blank" rel="noreferrer">{children} <ArrowUpRight size={13} aria-hidden="true"/></a>
}

function Weights({ items, date, label }: { items: FundWeight[]; date: string; label: string }) {
  return <div className="mini-weights"><h5>{label}</h5><p className="mini-muted">На {displayDate(date)}</p><dl>
    {items.map(item => <div key={item.name}><dt>{item.name}</dt><dd>{pct(item.share / 100)}</dd></div>)}
  </dl></div>
}

function ProjectedResults({ result, name }: { result: ReturnType<typeof fundScenario>; name?: string }) {
  if (!result) return <p className="mini-muted">Проверьте сумму и параметры расчёта.</p>
  const { grossProfit, netProfit, grossAnnual, netAnnual, grossReturn, netReturn, grossValue, netValue, tax } = result
  return <section className="mini-outcome" aria-label={name}>
    {name && <h5>{name}</h5>}
    <div className="mini-rate-pair">
      <strong title="До налога">{pct(grossReturn)}</strong>
      <ArrowRight size={13} aria-hidden="true"/>
      <strong title="После налога">{netReturn === null ? '—' : pct(netReturn)}</strong>
    </div>
    <div className="mini-profit-pair"><span title="До налога">{rub(grossProfit)}</span>{netProfit !== null && <span title="После налога">{rub(netProfit)}</span>}</div>
    <dl className="mini-result-lines">
      <div><dt>Стоимость {netValue === null ? 'до налога' : 'после налога'}</dt><dd>{rub(netValue ?? grossValue)}</dd></div>
      <div><dt>НДФЛ</dt><dd>{tax === null ? '—' : rub(tax)}</dd></div>
      <div><dt>Годовых до налога</dt><dd>{pct(grossAnnual)}</dd></div>
      {netAnnual !== null && <div><dt>Годовых после налога</dt><dd>{pct(netAnnual)}</dd></div>}
    </dl>
  </section>
}

function FundCard({ fund, input }: { fund: FundDisclosure; input: SlideInput }) {
  const rates = fundRates[fund.profile]
  const results = rates.map(rate => fundScenario(input, rate))
  const exit = fund.ticker ? 'Паи продаются на бирже через брокера, если есть ликвидность. Цена сделки может отличаться от стоимости пая по данным УК.' : 'Заявку на погашение можно подать в рабочий день. Срок выплаты и размер скидки определяются правилами фонда.'
  return <Disclosure title={fund.name} brief={fund.strategy} heading={<span className="mini-scenarios">
    {scenarioLabels.map((label, i) => <span key={label}><span>{label}</span><strong>{pct(fundPeriodReturn(rates[i], input.months))}</strong></span>)}
  </span>}>
    <section>
      <h4>До налогообложения → После налогообложения</h4>
      <p className="mini-muted">{fund.distributes ? 'Изменение стоимости пая' : 'Доходность'} за {duration[input.months]} и прибыль в рублях</p>
      <div className="mini-result-grid">{scenarioLabels.map((name, i) => <ProjectedResults key={name} name={name} result={results[i]}/>)}</div>
      <p className="mini-muted mini-caption">{input.model === 'resident' ? 'НДФЛ резидента по шкале 2026 года. Модель сохраняет эти правила на всём горизонте и учитывает указанную совместимую базу в год продажи.' : input.model === 'flat13' ? 'Упрощённый пример с НДФЛ 13% на положительный результат.' : 'Показан результат до налога.'} Входные и выходные комиссии, брокерский тариф и льготы не включены. Годовые допущения относятся к изменению стоимости пая после расходов фонда.</p>
      {fund.distributes && <p className="mini-muted mini-caption">КИД предусматривает выплаты по итогам квартала при наличии распределяемого дохода. Эти выплаты, их реинвестирование и налоги на них не входят в сценарий.</p>}
    </section>
    <section>
      <h4>Из чего состоит фонд</h4>
      <p>{fund.strategy}. {fund.currency || 'Валютные доли в используемом раскрытии не указаны.'}</p>
      <div className="mini-holdings">
        {fund.sectors.length > 0 && fund.sectorDate && <Weights items={fund.sectors} date={fund.sectorDate} label="Структура по данным страницы УК"/>}
        {fund.holdings.length > 0 && <Weights items={fund.holdings} date={fund.kidDate} label="Крупнейшие позиции по КИД"/>}
      </div>
      <p className="mini-muted mini-caption">КИД опубликован {displayDate(fund.published)} · Правила № {fund.id}</p>
    </section>
    <section>
      <h4>Как работает фонд</h4>
      <p>{annotations[fund.profile].income} {annotations[fund.profile].risk} {exit}</p>
    </section>
    <div className="mini-extras">
      <Detail title="Историческая доходность"><p className="mini-muted">{fund.historyDate ? 'Изменение за период на ' + displayDate(fund.historyDate) : 'Изменение за период по таблице КИД. Дата оценки в заголовке таблицы не указана.'}</p>
        <dl className="mini-result-lines">{[6, 12, 36, 60].map(period => <div key={period}><dt>{duration[period as SlideHorizon]}</dt><dd>{fund.history[period] === undefined ? 'Нет данных' : pct(fund.history[period] / 100)}</dd></div>)}</dl>
      </Detail>
      <Detail title="Комиссии"><dl className="mini-result-lines">
        <div><dt>Из активов фонда за год</dt><dd>{fund.annualFee === null ? 'См. КИД' : `${fund.feeCap ? 'до ' : ''}${pct(fund.annualFee / 100)}`}</dd></div>
        <div><dt>Надбавка</dt><dd>{fund.entryFee || 'См. КИД'}</dd></div>
        <div><dt>Скидка</dt><dd>{fund.exitFee || 'См. КИД'}</dd></div>
      </dl>{fund.ticker && <p className="mini-muted">На бирже дополнительно учитывайте спред и тариф брокера.</p>}</Detail>
      <Detail title="Налоговые льготы"><p>Для вычета за долгосрочное владение проверяют применимость к паям, даты покупки и реализации, срок владения и размер вычета. В сценарии вычет не применяется.</p><Link href={securitiesSource}>ФНС о налогообложении ценных бумаг</Link></Detail>
      <Detail title="Покупка и погашение">
        <p>Фонд сформирован {displayDate(fund.formed)}. {fund.ticker ? `Биржевой тикер ${fund.ticker}. Уточните доступность сделки и цену лота у брокера.` : `Минимальная сумма по КИД — ${rub(fund.minRub)}. Каналы покупки и условия для инвестора указаны в правилах и на странице УК.`}</p>
        <p>{exit}</p>
      </Detail>
      <Detail title="Другие горизонты"><dl className="mini-result-lines">{slideHorizons.filter(m => m !== input.months).map(months => {
        const base = fundScenario({ ...input, months }, rates[1])
        return <div key={months}><dt>{duration[months]}</dt><dd>{base ? `${pct(base.grossReturn)} → ${base.netReturn === null ? '—' : pct(base.netReturn)}` : '—'}</dd></div>
      })}</dl><p className="mini-muted">Базовый сценарий. Совокупная доходность до налога и после него.</p></Detail>
      <Detail title="Официальные источники"><ul className="mini-links">
        <li><Link href={fund.url}>Карточка УК ПСБ</Link></li><li><Link href={fund.kid}>Ключевой информационный документ (PDF)</Link></li>
        {fund.ticker && <li><Link href={`https://www.moex.com/ru/issue.aspx?code=${fund.ticker}`}>Карточка на Московской бирже</Link></li>}
      </ul></Detail>
    </div>
  </Disclosure>
}

function InstrumentCard({ product, input, start, keyRate }: { product: typeof instrumentSlides[number]; input: SlideInput; start: string; keyRate: number }) {
  const [rate, setRate] = useState(product.rate?.toString() ?? '')
  const result = product.model && rate !== '' ? instrumentScenario(input, product.model, Number(rate) / 100, start, keyRate) : null
  return <Disclosure title={product.name} brief={product.brief}>
    <section>
      <h4>{product.model ? 'До налогообложения → После налогообложения' : 'Параметры расчёта'}</h4>
      {product.model ? <>
        <label className="mini-local-rate"><span>Условная годовая {product.model === 'gold' ? 'динамика цены' : 'ставка'}, %</span><input type="number" step=".1" min={product.model === 'gold' ? -99 : 0} max="100" value={rate} onChange={e => setRate(e.target.value)}/></label>
        <div className="mini-single-result"><ProjectedResults result={result}/></div>
        <p className="mini-muted mini-caption">Модельный пример на {duration[input.months]}. {product.tax}</p>
      </> : <p>{product.tax} Для расчёта нужна индивидуальная документация.</p>}
    </section>
    <section><h4>Как работает инструмент</h4><p>{product.economics}</p></section>
    <Detail title="Условия выхода и риски"><p>{product.exit}</p></Detail>
    <Detail title="Официальные источники"><p><Link href={product.url}>Отраслевой источник</Link></p>
      {['deposit', 'savings'].includes(product.id) && <p><Link href={taxSource}>ФНС о налогообложении банковских процентов</Link></p>}
      {product.id === 'bond' && <p><a className="text-link" href="#portfolio">Конструктор капитала и калькулятор облигаций</a></p>}</Detail>
  </Disclosure>
}

export function useInvestmentInputs() {
  const [amount, setAmount] = useState('1000000')
  const [months, setMonths] = useState<SlideHorizon>(12)
  const [model, setModel] = useState<TaxModel>('resident')
  const [otherBase, setOtherBase] = useState('0')
  const [keyRate, setKeyRate] = useState('21')
  return { amount, setAmount, months, setMonths, model, setModel, otherBase, setOtherBase, keyRate, setKeyRate }
}

export function InvestmentSlides({ compact = false, start, bankCatalog, fields }: {
  compact?: boolean
  start: string
  bankCatalog?: ReactNode
  fields: ReturnType<typeof useInvestmentInputs>
}) {
  const { amount, setAmount, months, setMonths, model, setModel, otherBase, setOtherBase, keyRate, setKeyRate } = fields
  const [category, setCategory] = useState<'funds' | 'other' | 'bank'>('funds')
  const input = { amount: Number(amount), months, model, otherBase: model !== 'resident' ? 0 : otherBase === '' ? NaN : Number(otherBase) }
  const prefix = useId()
  return <section className="investment-slides" aria-labelledby={prefix + '-heading'}>
    {compact && <header className="mini-section-head"><h2 id={prefix + '-heading'}>Инвестиционные продукты</h2><a className="text-link" href="#products">Весь каталог <ArrowUpRight size={15} aria-hidden="true"/></a></header>}
    {!compact && <h2 id={prefix + '-heading'} className="sr-only">Каталог финансовых продуктов</h2>}
    {!compact && <div className="mini-categories" aria-label="Категории продуктов">
      {([['funds', 'Фонды УК ПСБ'], ['other', 'Другие инструменты'], ['bank', 'Вклады и счета ПСБ']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}
    </div>}
    {category !== 'bank' && <div className="mini-controls">
      <label><span>Сумма размещения, ₽</span><input type="number" min=".01" max="1000000000" step=".01" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <label><span>Горизонт расчёта</span><select value={months} onChange={e => setMonths(Number(e.target.value) as SlideHorizon)}>{slideHorizons.map(m => <option key={m} value={m}>{duration[m]}</option>)}</select></label>
      <label><span>Налоговый режим</span><select value={model} onChange={e => setModel(e.target.value as TaxModel)}><option value="resident">Резидент · {slideTaxYear}</option><option value="flat13">Пример · 13%</option><option value="gross">До налогообложения</option></select></label>
      {model === 'resident' && <label><span>Прочая совместимая база, ₽</span><input type="number" min="0" max="1000000000000" step=".01" value={otherBase} onChange={e => setOtherBase(e.target.value)}/></label>}
      {category === 'other' && model === 'resident' && <label><span>Модельный максимум ключевой ставки, %</span><input type="number" min="0" max="100" step=".01" value={keyRate} onChange={e => setKeyRate(e.target.value)}/></label>}
    </div>}
    <div hidden={category !== 'funds'} className="mini-list">
      <p className="mini-list-note">Сценарная доходность до налогообложения за выбранный срок. Результаты не гарантированы.</p>
      {fundDisclosures.slice(0, compact ? 3 : 12).map(fund => <FundCard key={fund.id} fund={fund} input={input}/>)}
      {!compact && <><h3 className="mini-group-heading">Биржевые фонды</h3>{fundDisclosures.slice(12).map(fund => <FundCard key={fund.id} fund={fund} input={input}/>)}</>}
    </div>
    {!compact && <div hidden={category !== 'other'} className="mini-list">{instrumentSlides.map(product => <InstrumentCard key={product.id} product={product} input={input} start={start} keyRate={keyRate === '' ? NaN : Number(keyRate)}/>)}</div>}
    {!compact && <div hidden={category !== 'bank'}>{bankCatalog}</div>}
  </section>
}
