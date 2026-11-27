import { useMemo, useState } from 'react'
import { BookOpen, Download, Printer, ShieldCheck } from 'lucide-react'
import { concentration } from '../analytics/wealth'
import { bondMetrics, accruedCoupon, goal, termLadder } from '../finance/returns'
import type { FxRates } from '../finance/model'
import { availableAt, type Snapshot } from '../market/snapshot'
import type { Portfolio } from '../portfolio/workspace'
import { downloadFile, eventsCsv } from '../reporting/files'
import { CapitalChart, type Projection } from './CapitalChart'
import { YearlyLedger } from './LedgerViews'
import { percent, rub } from './format'

export function RiskView({ portfolio, fx, projection }: { portfolio: Portfolio; fx: FxRates; projection: Projection }) {
  const { issuers, currency, liquidity } = concentration(portfolio, fx)
  return <section className="panel feature-panel">
    <div className="panel-heading"><div><h2>Риски и концентрация</h2><p>Доли по введённым позициям и текущей оценке</p></div><span className="tile blue"><ShieldCheck size={18}/></span></div>
    <div className="risk-columns">{[
      { label: 'Эмитенты', items: issuers }, { label: 'Валютная структура', items: currency }, { label: 'Ликвидность', items: liquidity },
    ].map(({ label, items }) => <article key={label}><h3>{label}</h3><dl className="result-list">{items.slice(0, 5).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{projection.opening ? percent(value / projection.opening) : '—'}</dd></div>)}</dl></article>)}</div>
    {issuers[0] && issuers[0][1] / projection.opening >= .35 && <p className="notice">На крупнейшего эмитента приходится {percent(issuers[0][1] / projection.opening)} капитала. Порог уведомления 35 % задан правилом приложения.</p>}
    <p className="secondary">Оценка зависит от названия эмитента и пользовательской категории ликвидности. Страховую применимость каждого банковского продукта следует проверить у <a href="https://www.asv.org.ru/" className="text-link" target="_blank" rel="noreferrer">АСВ</a>.</p>
  </section>
}

export function GoalsAndLadder({ start, initial }: { start: string; initial: number }) {
  const [capital, setCapital] = useState(initial)
  const [target, setTarget] = useState(initial > 0 ? initial * 1.5 : 1e6)
  const [months, setMonths] = useState(60)
  const [yieldRate, setYield] = useState(8)
  const [inflation, setInflation] = useState(6)
  const [terms, setTerms] = useState([3, 6, 12, 24])
  const outcome = goal(capital, target, months, yieldRate / 100, inflation / 100)
  const ladder = termLadder(capital, start, terms, yieldRate / 100)
  return <div className="two-column">
    <section className="panel feature-panel">
      <div className="panel-heading"><div><h2>Финансовая цель</h2><p>Сумма в сегодняшних ценах</p></div></div>
      <div className="field-grid">
        <label>Стартовый капитал, ₽<input type="number" min={0} value={capital} onChange={e => setCapital(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label>
        <label>Целевой капитал, ₽<input type="number" min={0} value={target} onChange={e => setTarget(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label>
        <label>Месяцев<input type="number" min={1} max={360} value={months} onChange={e => setMonths(Math.min(360, Math.max(1, Math.floor(Number(e.target.value)))))}/></label>
        <label>Годовая чистая доходность, %<input type="number" min={-90} max={100} value={yieldRate} onChange={e => setYield(Math.min(100, Math.max(-90, Number(e.target.value))))}/></label>
        <label>Инфляция, %<input type="number" min={-10} max={100} value={inflation} onChange={e => setInflation(Math.min(100, Math.max(-10, Number(e.target.value))))}/></label>
      </div>
      <div className="large-result">{rub(outcome.monthly)}</div><p className="secondary">Необходимый взнос в конце каждого месяца.</p><p className="secondary">Цель с учётом инфляции {rub(outcome.nominalTarget)}. При нулевых взносах стартовый капитал составит {rub(outcome.initialNeeded)}.</p>
    </section>
    <section className="panel feature-panel">
      <div className="panel-heading"><div><h2>Лестница размещений</h2><p>Равные доли, простые проценты ACT/365</p></div></div>
      <div className="filter-row">{[1, 3, 6, 9, 12, 24, 36].map(month => <label key={month} className="inline-field"><input type="checkbox" checked={terms.includes(month)} disabled={terms.length === 1 && terms.includes(month)} onChange={e => setTerms(current => (e.target.checked ? [...current, month] : current.filter(value => value !== month)).sort((a, b) => a - b))}/>{month} мес.</label>)}</div>
      <div className="table-scroll"><table><thead><tr><th>Погашение</th><th>Капитал</th><th>Доход</th></tr></thead><tbody>{ladder.map(row => <tr key={row.months}><td>{row.maturity}</td><td>{rub(row.principal)}</td><td>{rub(row.income)}</td></tr>)}</tbody></table></div>
    </section>
  </div>
}

export function BacktestView({ data, date }: { data?: Snapshot; date: string }) {
  const [from, setFrom] = useState(date.slice(0, 4) + '-01-01')
  const [capital, setCapital] = useState(1e7)
  const [series, setSeries] = useState<'gold' | 'USD' | 'CNY'>('gold')
  const source = data?.sources[series]
  const a = availableAt(source, from), b = availableAt(source, date)
  const near = (observation: typeof a, input: string) => observation && Date.parse(input) - Date.parse(observation.date) <= 7 * 86400000
  const valid = Boolean(from && from < date && near(a, from) && near(b, date) && a!.date < b!.date && a!.value > 0)
  const count = source?.series.filter(p => p.date >= from && p.date <= date).length ?? 0
  return <section className="panel feature-panel">
    <div className="panel-heading"><div><h2>Историческая симуляция ориентира</h2><p>Вход по последнему наблюдению на дату, оценка на {date}</p></div></div>
    <div className="field-grid portfolio-fields"><label>Начало периода<input type="date" value={from} max={date} onChange={e => setFrom(e.target.value)}/></label><label>Первоначальный капитал, ₽<input type="number" min={0} value={capital} onChange={e => setCapital(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label><label>Ориентир<select value={series} onChange={e => setSeries(e.target.value as typeof series)}><option value="gold">Золото · учётная цена</option><option value="USD">USD/RUB</option><option value="CNY">CNY/RUB</option></select></label></div>
    {valid ? <><div className="large-result">{rub(capital * b!.value / a!.value)}</div><p className="secondary">Изменение {percent(b!.value / a!.value - 1)} · оценки {a!.date} и {b!.date} · {count} наблюдений в интервале.</p></> : <p className="empty">Нет достаточных котировок для обеих дат. Предельный разрыв с наблюдением 7 дней.</p>}
    <p className="secondary">Расчёт показывает изменение ориентира без налогов, комиссий, спреда и денежных потоков. Для симуляции конкретных продуктов нужны исторические договорные условия.</p>
  </section>
}

export function FixedIncomeView({ portfolio, start }: { portfolio: Portfolio; start: string }) {
  const records = portfolio.assets.filter(a => a.kind === 'ОФЗ' || a.kind.includes('облигации'))
  return <section className="panel feature-panel"><div className="panel-heading"><div><h2>Аналитика облигаций</h2><p>Введите отдельный денежный график, номинал и полную цену позиции</p></div></div>
  {records.length ? <div className="table-scroll"><table><thead><tr><th>Позиция</th><th>YTM</th><th>Дюрация</th><th>Модифицированная</th><th>Оценка НКД</th></tr></thead><tbody>{records.map(a => {
    const schedule = [...a.contract?.schedule ?? []].sort((x, y) => x.date.localeCompare(y.date))
    const metrics = bondMetrics(a.amount, start, schedule.map(row => ({ date: row.date, amount: row.income + row.principal })))
    const previous = schedule.filter(row => row.date <= start).at(-1), next = schedule.find(row => row.date > start)
    const accrued = previous && next && previous.income === next.income && next.income > 0 ? accruedCoupon(next.income, previous.date, next.date, start) : null
    return <tr key={a.id}><td>{a.name} · {a.currency}</td><td>{metrics ? percent(metrics.ytm) : '—'}</td><td>{metrics ? metrics.duration.toFixed(2) : '—'}</td><td>{metrics ? metrics.modifiedDuration.toFixed(2) : '—'}</td><td>{accrued === null ? '—' : accrued.toFixed(2) + ' ' + a.currency}</td></tr>
  })}</tbody></table></div> : <p className="empty">В портфеле пока нет облигаций.</p>}<p className="secondary">YTM и дюрация дисконтируют будущие строки по ACT/365. НКД оценивается между соседними равными купонами.</p></section>
}

export function ReportView({ portfolio, projection, fx, date, watermark }: { portfolio: Portfolio; projection: Projection; fx: FxRates; date: string; watermark: boolean }) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  async function exportReport(format: 'pdf' | 'xlsx') {
    setExporting(true)
    setError('')
    try {
      if (format === 'pdf') {
        const { downloadPortfolioPdf } = await import('../reporting/document')
        await downloadPortfolioPdf(portfolio, date, projection, fx)
      } else {
        const [{ buildWorkbook }, { reportSheets }] = await Promise.all([import('../reporting/xlsx'), import('../reporting/reportData')])
        const bytes = buildWorkbook(reportSheets(portfolio, date, projection, fx))
        downloadFile('dynamic-invest-report.xlsx', new Uint8Array(bytes).buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сформировать файл.') }
    finally { setExporting(false) }
  }
  return <div className="stack report-view">
    <section className={'panel feature-panel report-cover' + (watermark ? ' watermarked' : '')}>
      <img className="print-brand" src={import.meta.env.BASE_URL + 'brand/logo-light.svg'} alt="DYNAMIC INVEST"/>
      <div className="panel-heading"><div><h2>Обзор капитала · {portfolio.name}</h2><p>Модельный финансовый отчёт · {date}</p></div><div className="toolbar wrap no-print"><button className="button primary" onClick={() => window.print()}><Printer size={16}/>Печать / PDF</button><button className="button quiet" disabled={exporting} onClick={() => void exportReport('pdf')}>Скачать PDF</button><button className="button quiet" disabled={exporting} onClick={() => void exportReport('xlsx')}>Скачать XLSX</button><button className="button quiet" onClick={() => downloadFile('dynamic-invest-report.csv', eventsCsv(projection.events), 'text/csv;charset=utf-8')}><Download size={16}/>События CSV</button></div></div>
      {error && <p role="alert" className="notice">{error}</p>}
      <div className="large-result">{rub(projection.final.value)}</div><p>Прогноз на {projection.end} · чистый результат {rub(projection.totals.net)}</p>
      <p className="secondary">Учтены введённые комиссии {rub(projection.totals.fees)}. Условное налоговое обязательство {rub(projection.totals.assessed)} применяется только по параметрам сценария.</p>
    </section>
    <CapitalChart projection={projection} unit="RUB" rate={1}/><RiskView portfolio={portfolio} fx={fx} projection={projection}/><YearlyLedger projection={projection}/>
  </div>
}

const lessons = [
  { title: 'Валютный спред', text: 'Курс покупки и продажи отличается от рыночного ориентира. Разница уменьшает доходность обеих валютных конверсий.', example: 'При равном официальном курсе и нашем сценарном спреде 1% на каждой стороне после обратного обмена останется примерно 98,02% первоначальной суммы.', question: 'Почему сравнивают итог в одной валюте?', answer: 'Доход в валюте размещения нужно перевести по реальному курсу выхода, чтобы сравнить покупательную способность.' },
  { title: 'TWR и XIRR', text: 'TWR связывает доходности участков между внешними потоками. XIRR решает уравнение дисконтированных денежных потоков по точным датам.', example: 'Портфель вырос со 100 до 110, владелец внёс 100, затем капитал стал 231. TWR равен 1,10 × 1,10 − 1 = 21%.', question: 'Считать ли пополнение инвестиционным доходом?', answer: 'Нет. В TWR оно меняет базу следующего участка, а в XIRR учитывается как внешний денежный поток.' },
  { title: 'Налоговая база по ценным бумагам', text: 'Финансовый результат реализации учитывает документированные расходы. Для пенсионных, валютных и льготных операций могут действовать отдельные правила.', example: 'Если выручка 150 000 ₽, подтверждённая стоимость покупки 130 000 ₽, а комиссия 1 000 ₽, результат до прочих корректировок равен 19 000 ₽.', question: 'Облагается ли сама переоценка до продажи?', answer: 'В обычном расчёте реализации учитывается состоявшаяся операция. Прогнозная рыночная оценка сама по себе не считается продажей.' },
  { title: 'Данные на дату и эффект заглядывания', text: 'Исторический расчёт использует публикации, доступные участнику к моменту оценки. Дата котировки и дата публикации могут различаться.', example: 'Котировка за 15 января, опубликованная 17 января, недоступна для решения 16 января.', question: 'Можно ли заполнить прошлый пробел следующей котировкой?', answer: 'Такой приём создаёт эффект заглядывания. Понадобится доступная более ранняя цена в пределах допустимого интервала.' },
  { title: 'Годовой сценарий и фиксированная ставка', text: 'Договорный вклад сохраняет установленную ставку. Изменения рыночных ставок отражаются на моделируемых накопительных счетах, переоценке облигаций и новых размещениях.', example: 'Если накопительный счёт имел базу 10%, а параметр нового года равен +2 п.п., модель начисляет 12% с даты смены года.', question: 'Что означает курсовой сценарий +10% в двух соседних годах?', answer: 'Оба года используют уровень +10% к исходному курсу. Дополнительного повышения на второй год нет.' },
  { title: 'Банковский процент', text: 'При простом начислении сумма не увеличивает базу следующего периода. При капитализации выплаченные проценты прибавляются к остатку.', example: '100 000 ₽ на год под 12 % простыми процентами дают 12 000 ₽ до налога.', question: 'Что станет базой после капитализации?', answer: 'Остаток вклада плюс присоединённые проценты.' },
  { title: 'Дюрация и доходность облигаций', text: 'YTM решает уравнение между полной ценой и приведённой стоимостью будущих платежей. Дюрация взвешивает сроки этих платежей.', example: 'У бескупонной бумаги с единственной выплатой через год дюрация равна одному году.', question: 'Как сдвиг доходности связан с ценой?', answer: 'Для положительной дюрации повышение доходности снижает цену при прочих равных.' },
  { title: 'Инфляция и реальная доходность', text: 'Реальная доходность измеряет изменение покупательной способности. Чистый коэффициент роста делят на индекс цен.', example: 'Рост на 10 % при инфляции 5 % даёт около 4,76 % в реальном выражении.', question: 'Достаточно ли вычесть инфляцию из номинальной ставки?', answer: 'Вычитание даёт приближение. Точный расчёт использует отношение коэффициентов.' },
  { title: 'Цена фонда и денежная выплата', text: 'Рост стоимости пая увеличивает оценку. Денежная выплата требует отдельного события в правилах фонда.', example: 'Пай подорожал с 1 000 ₽ до 1 100 ₽. До продажи или распределения денежный доход отсутствует.', question: 'Будет ли рост цены отражён в календаре выплат?', answer: 'Только подтверждённые или явно смоделированные денежные события попадают в календарь.' },
]

export function Academy() {
  const [query, setQuery] = useState('')
  const visible = lessons.filter(item => (item.title + item.text).toLowerCase().includes(query.toLowerCase()))
  return <section className="panel feature-panel stack"><div className="panel-heading"><div><h2>Финансовая академия</h2><p>{lessons.length} уроков с примерами и вопросами для самопроверки</p></div><span className="tile blue"><BookOpen size={18}/></span></div><input placeholder="Поиск по темам" aria-label="Поиск по академии" type="search" value={query} onChange={e => setQuery(e.target.value)}/>
    {!visible.length && <p className="secondary" role="status">По запросу нет уроков.</p>}<div className="academy-grid">{visible.map(item => <article className="source-card" key={item.title}><h3>{item.title}</h3><p>{item.text}</p><p>{item.example}</p><details><summary>{item.question}</summary><p>{item.answer}</p></details></article>)}</div>
  </section>
}

export function Analyst({ p, projection, fx }: { p: Portfolio; projection: Projection; fx: FxRates }) {
  const [prompt, setPrompt] = useState('income')
  const findings = useMemo(() => {
    const income = new Map<string, number>()
    for (const e of projection.events.filter(e => e.type === 'income')) income.set(e.name, (income.get(e.name) ?? 0) + e.rubles)
    const lead = [...income].sort((a, b) => b[1] - a[1])[0]
    const largest = concentration(p, fx).issuers[0]
    return {
      income: lead ? `Больше всего поступлений формирует «${lead[0]}» · ${rub(lead[1])}. Переоценка за горизонт отдельно составляет ${rub(projection.totals.valuation)}.` : 'В выбранном горизонте денежных выплат нет.',
      risk: largest && projection.opening ? `На «${largest[0]}» приходится ${percent(largest[1] / projection.opening)} начальной стоимости. Ликвидность отдельных позиций указана вручную.` : 'Добавьте позиции для оценки концентрации.',
      real: projection.opening > 0 ? `Номинальный капитал к концу периода: ${rub(projection.final.value)}. В покупательной способности начала периода: ${rub(projection.final.real)}. Разница: ${rub(projection.final.value - projection.final.real)}.` : 'Добавьте позиции для расчёта покупательной способности.',
      costs: `Комиссии: ${rub(projection.totals.fees)}. Подтверждённые налоговые платежи и сценарные обязательства учитываются отдельно.`,
      tax: projection.totals.assessed ? `Условное обязательство по сценарию ${rub(projection.totals.assessed)}. Правила банковского НДФЛ доступны в разделе «Налоги».` : 'В сценарии налоговое обязательство не рассчитано. Банковский НДФЛ можно оценить в разделе «Налоги».',
    }
  }, [p, projection, fx])
  return <section className="panel feature-panel stack"><div className="panel-heading"><div><h2>Финансовый аналитик</h2><p>Локальные аналитические правила · языковая модель не подключена</p></div></div><label className="compact-control"><span>Вопрос</span><select value={prompt} onChange={e => setPrompt(e.target.value)}><option value="income">Что формирует денежный поток?</option><option value="risk">Где сосредоточен риск?</option><option value="tax">Как учтены налоги?</option><option value="real">Что меняет инфляция?</option><option value="costs">Какие комиссии учтены?</option></select></label><p role="status">{findings[prompt as keyof typeof findings]}</p></section>
}
