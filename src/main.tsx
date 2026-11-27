import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, Archive, BriefcaseBusiness, CalendarDays, Compass, FlaskConical, Globe2, House, Menu, Moon, PanelsTopLeft, Plus, Presentation, ReceiptText, Settings, Sun, X } from 'lucide-react'
import { wealthMetrics } from './analytics/wealth'
import { dateKey } from './finance/engine'
import { projectLedger } from './finance/ledger'
import { currencies, validDate, type Asset, type Currency } from './finance/model'
import { assumptions, initialScenarios, scenarioNames, type ScenarioInput, type ScenarioName } from './features/scenarios'
import { loadSnapshot, snapshotFx, type Snapshot } from './market/snapshot'
import { accountingFx, allocation, available, maxAssets, maxPortfolios, persistWorkspace, readWorkspace, replacePortfolio, type Portfolio, type Workspace } from './portfolio/workspace'
import { AssetEditor, Portfolio as PositionTable } from './ui/Portfolio'
import { PortfolioSettings, BackupTools } from './ui/PortfolioSettings'
import { HistoricalHome, WealthDashboard } from './ui/WealthDashboard'
import { MarketViews, SourceDirectory } from './ui/MarketViews'
import { LedgerCalendar } from './ui/LedgerViews'
import { TaxView } from './ui/TaxView'
import { ProductCatalog, favoritesKey } from './ui/ProductCatalog'
import { ScenarioEditor, StrategyView } from './ui/StrategyView'
import './style.css'

const PrivateStudio = lazy(() => import('./ui/Studio').then(m => ({ default: m.PrivateStudio })))
const CapitalBusinessLab = lazy(() => import('./ui/Studio').then(m => ({ default: m.CapitalBusinessLab })))
const ArchiveCoverage = lazy(() => import('./ui/ArchiveCoverage').then(m => ({ default: m.ArchiveCoverage })))
const Academy = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.Academy })))
const Analyst = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.Analyst })))
const BacktestView = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.BacktestView })))
const ReportView = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.ReportView })))
const GoalsAndLadder = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.GoalsAndLadder })))
const RiskView = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.RiskView })))
const FixedIncomeView = lazy(() => import('./ui/ResearchTools').then(m => ({ default: m.FixedIncomeView })))
const Calculator = lazy(() => import('./ui/Calculator').then(m => ({ default: m.Calculator })))

const today = dateKey()
const todayYear = Number(today.slice(0, 4))
const brand = import.meta.env.BASE_URL + 'brand/'
const settingsKey = 'dynamic-invest:settings:v2'
const pages = {
  dashboard: { label: 'Главная', title: 'Обзор капитала', subtitle: 'Текущая оценка и сценарная траектория', icon: House },
  portfolio: { label: 'Капитал', title: 'Конструктор капитала', subtitle: 'Портфели, договорные условия и денежный резерв', icon: BriefcaseBusiness },
  products: { label: 'Финансовые продукты', title: 'Финансовые продукты', subtitle: 'Официальные источники и параметры инструментов', icon: PanelsTopLeft },
  archive: { label: 'Архив', title: 'Финансовая история', subtitle: 'Архив рыночных данных и историческое моделирование', icon: Archive },
  tax: { label: 'Налоги', title: 'Налоговая аналитика', subtitle: 'Банковские проценты и налоговые правила по годам', icon: ReceiptText },
  scenarios: { label: 'Стратегии', title: 'Стратегии и сценарии', subtitle: 'Сравнение капитала в разных экономических условиях', icon: FlaskConical },
  market: { label: 'Экономика и рынки', title: 'Экономика и рынки', subtitle: 'История показателей и качество источников', icon: Globe2 },
  analytics: { label: 'Аналитический центр', title: 'Аналитический центр', subtitle: 'Риски, финансовые цели, отчётность и обучение', icon: Compass },
  calendar: { label: 'Календарь выплат', title: 'Денежные потоки', subtitle: 'Поступления, погашения и реинвестирование', icon: CalendarDays },
  settings: { label: 'Настройки', title: 'Настройки', subtitle: 'Оформление и резервные копии', icon: Settings },
}
type Page = keyof typeof pages
type Mode = 'past' | 'present' | 'future'
const primary: Page[] = ['dashboard', 'portfolio', 'products', 'archive', 'tax', 'scenarios', 'market', 'analytics']
const secondary: Page[] = ['calendar', 'settings']
const currentPage = (): Page => {
  const name = location.hash.slice(1)
  if (name === 'calculator') return 'analytics'
  return Object.hasOwn(pages, name) ? name as Page : 'dashboard'
}
const horizons = [1, 3, 6, 12, 24, 36, 60, 120, 180, 240, 360]
const periodLabel = (value: number) => value < 12 ? value + ' мес.' : value / 12 + ' г.'
const defaults = { theme: 'light' as 'light' | 'dark', watermark: true, scenarios: initialScenarios }

function readSettings() {
  try {
    const previous = localStorage.getItem(settingsKey)
    if (!previous) return defaults
    const parsed = JSON.parse(previous)
    const scenarios = { ...initialScenarios }
    for (const name of scenarioNames) {
      const value = parsed.scenarios?.[name]
      if (!value) continue
      const keys = ['inflation', 'key', 'yield', 'spread', 'usd', 'cny', 'growth', 'tax'] as const
      if (keys.every(k => typeof value[k] === 'number' && Number.isFinite(value[k]) && value[k] > -100 && value[k] <= 100) && typeof value.early === 'boolean') {
        scenarios[name] = Object.fromEntries([...keys.map(k => [k, value[k]]), ['early', value.early]]) as unknown as ScenarioInput
      }
    }
    return { theme: parsed.theme === 'dark' ? 'dark' as const : 'light' as const, watermark: parsed.watermark !== false, scenarios }
  } catch { return defaults }
}

function ConfirmRemoval({ asset, close, remove }: { asset: Asset; close: () => void; remove: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="panel dialog delete-dialog" onCancel={e => { e.preventDefault(); close() }} aria-labelledby="delete-title"><h2 id="delete-title">Удалить актив?</h2><p>«{asset.name}» будет удалён из портфеля и расчётов.</p><div className="form-actions"><button className="button quiet" autoFocus onClick={close}>Отмена</button><button className="button remove" onClick={remove}>Удалить</button></div></dialog>
}

function App() {
  const [page, setPage] = useState(currentPage)
  const [settings, setSettings] = useState(readSettings)
  const [drawer, setDrawer] = useState(false)
  const [state, setState] = useState(() => readWorkspace(today))
  const [editor, setEditor] = useState<{ asset?: Asset; duplicate?: boolean } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<Asset | null>(null)
  const [mode, setMode] = useState<Mode>(currentPage() === 'archive' ? 'past' : 'present')
  const [historical, setHistorical] = useState('2025-12-31')
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const values: unknown = JSON.parse(localStorage.getItem(favoritesKey) ?? '[]')
      return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string').slice(0, 100) : []
    } catch { return [] }
  })
  const [months, setMonths] = useState(12)
  const [custom, setCustom] = useState(false)
  const [scenario, setScenario] = useState<ScenarioName>('Базовый')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [presentation, setPresentation] = useState(false)
  const [market, setMarket] = useState<Snapshot>()
  const [marketError, setMarketError] = useState('')
  const [analysisTab, setAnalysisTab] = useState(location.hash === '#calculator' ? 'calculator' : 'analyst')

  useEffect(() => {
    const onHash = () => { setPage(currentPage()); setDrawer(false); if (location.hash === '#calculator') setAnalysisTab('calculator'); window.scrollTo(0, 0) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(false); setPresentation(false) } }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('keydown', onKey) }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    try { if (settings !== defaults) localStorage.setItem(settingsKey, JSON.stringify(settings)) } catch { /* Applies for the current session. */ }
  }, [settings])
  useEffect(() => {
    let active = true
    loadSnapshot().then(value => { if (active) setMarket(value) }).catch(() => { if (active) setMarketError('Не удалось загрузить официальный снимок рынка.') })
    return () => { active = false }
  }, [])

  const { data, message } = state
  const portfolio = data.portfolios.find(p => p.id === data.active)!
  const { fx, missing } = useMemo(() => snapshotFx(market, today, accountingFx), [market])
  const scenarioData = settings.scenarios[scenario]
  const options = useMemo(() => assumptions(scenarioData, portfolio, fx), [scenarioData, portfolio, fx])
  const projection = useMemo(() => projectLedger(portfolio.assets, fx, today, months, available(portfolio), options), [fx, months, options, portfolio])
  const annual = useMemo(() => months === 12 ? projection : projectLedger(portfolio.assets, fx, today, 12, available(portfolio), options), [fx, months, options, portfolio, projection])
  const metrics = wealthMetrics(portfolio, fx, projection, annual, months)
  const date = mode === 'past' ? historical : today
  const current = pages[page]
  const projected = presentation ? 'dashboard' : page

  function update(next: Workspace) {
    try { persistWorkspace(next); setState({ data: next, message: '' }) }
    catch { setState({ data: next, message: 'Не удалось сохранить данные в браузере. Сделайте резервную копию JSON перед закрытием.' }) }
  }
  function changePortfolio(next: Portfolio) {
    if (next.budget < allocation(next.assets)) throw new Error('Недостаточно свободного капитала. Увеличьте бюджет или уменьшите сумму приобретения.')
    update(replacePortfolio(data, next))
  }
  function createPortfolio() {
    if (data.portfolios.length >= maxPortfolios) { setState({ data, message: `Доступно до ${maxPortfolios} портфелей.` }); return }
    const id = crypto.randomUUID()
    update({ ...data, active: id, portfolios: [...data.portfolios, { id, name: `Портфель ${data.portfolios.length + 1}`, budget: 0, assets: [], contribution: 0, withdrawal: 0, reinvest: 0, demo: false }] })
  }
  function clearStorage() {
    try { for (let i = localStorage.length - 1; i >= 0; i--) { const key = localStorage.key(i); if (key?.startsWith('dynamic-invest:')) localStorage.removeItem(key) } }
    catch { setState({ data, message: 'Браузер не разрешил удалить локальные данные.' }); return }
    setState(readWorkspace(today))
    setSettings(defaults)
    setFavorites([])
  }
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id]
    setFavorites(next)
    try { localStorage.setItem(favoritesKey, JSON.stringify(next)) } catch { /* Session-only state. */ }
  }
  function navigate(target: Page) {
    if (target === 'archive' && mode !== 'past') setMode('past')
    setDrawer(false)
  }

  return <div className={'app-shell' + (presentation ? ' presentation' : '')}>
    {drawer && <button className="drawer-overlay" aria-label="Закрыть меню" onClick={() => setDrawer(false)}/>}
    <aside className={`sidebar ${drawer ? 'drawer-open' : ''}`} aria-label="Разделы приложения">
      <a href="#dashboard" className="brand" onClick={() => setDrawer(false)}><img src={brand + 'logo-' + settings.theme + '.svg'} alt="DYNAMIC INVEST · Wealth Intelligence"/></a>
      <nav aria-label="Основная навигация">
        <div className="nav-caption">РАБОЧАЯ ОБЛАСТЬ</div>
        {primary.map(key => { const { label, icon: Icon } = pages[key]; return <a key={key} href={`#${key}`} aria-current={key === page ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={18}/>{label}</a> })}
        <div className="nav-caption nav-divider">ИНСТРУМЕНТЫ</div>
        {secondary.map(key => { const { label, icon: Icon } = pages[key]; return <a key={key} href={`#${key}`} aria-current={key === page ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={18}/>{label}</a> })}
      </nav>
      <div className="sidebar-footer"><div className="workspace"><span className="workspace-icon"><Activity size={16}/></span><div><b>Частный капитал</b><span>Локальное хранилище</span></div></div><div className="version"><span>5.0 ULTRA</span><span>В разработке</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-button menu-button" aria-label="Открыть меню" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>{drawer ? <X size={21}/> : <Menu size={21}/>}</button><span>Рабочая область</span><span className="crumb-sep">/</span><b>{presentation ? 'Демонстрация' : current.label}</b></div>
        <div className="top-actions">{portfolio.demo && <span className="demo-badge"><span/>Демопортфель</span>}
          <button className="icon-button theme-button" aria-label={settings.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} onClick={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}>{settings.theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button className="icon-button theme-button" aria-label={presentation ? 'Выйти из презентации' : 'Открыть презентацию'} aria-pressed={presentation} onClick={() => { setPresentation(!presentation); window.scrollTo(0, 0) }}>{presentation ? <X size={18}/> : <Presentation size={18}/>}</button>
        </div>
      </header>
      <main>
        {!presentation && <div className="global-controls">
          <div className="segmented mode-tabs" aria-label="Временной режим">{(['past', 'present', 'future'] as const).map((m, i) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{['Прошлое', 'Настоящее', 'Будущее'][i]}</button>)}</div>
          {mode === 'past' ? <>
            <label className="compact-control"><span>Год</span><select aria-label="Год" value={historical.slice(0, 4)} onChange={e => setHistorical(e.target.value === String(todayYear) ? today : e.target.value + '-12-31')}>{Array.from({ length: Math.max(1, todayYear - 2022) }, (_, i) => 2023 + i).map(year => <option key={year}>{year}</option>)}</select></label>
            <label className="compact-control"><span>Дата</span><input type="date" min="2023-01-01" max={today} value={historical} onChange={e => { if (validDate(e.target.value) && e.target.value <= today && e.target.value >= '2023-01-01') setHistorical(e.target.value) }}/></label>
          </> : <span className="control-date"><CalendarDays size={15}/>{today}</span>}
          <label className="compact-control"><span>Портфель</span><select value={data.active} onChange={e => update({ ...data, active: e.target.value })}>{data.portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="compact-control"><span>Горизонт</span><select aria-label="Горизонт" value={custom ? 'custom' : months} onChange={e => { setCustom(e.target.value === 'custom'); if (e.target.value !== 'custom') setMonths(Number(e.target.value)) }}>{horizons.map(m => <option key={m} value={m}>{periodLabel(m)}</option>)}<option value="custom">Свой</option></select></label>
          {custom && <label className="compact-control custom-months"><span>Месяцев</span><input type="number" min={1} max={360} value={months} onChange={e => setMonths(Math.min(360, Math.max(1, Math.floor(Number(e.target.value)))))}/></label>}
          <label className="compact-control"><span>Сценарий</span><select value={scenario} onChange={e => setScenario(e.target.value as ScenarioName)}>{scenarioNames.map(name => <option key={name}>{name}</option>)}</select></label>
          <label className="compact-control"><span>Валюта</span><select value={currency} onChange={e => setCurrency(e.target.value as Currency)}>{currencies.map(code => <option key={code}>{code}</option>)}</select></label>
        </div>}
        {projected !== 'dashboard' && <div className="page-heading"><div><h1>{current.title}</h1><p>{current.subtitle}</p></div>{page === 'portfolio' && <button className="button primary" onClick={() => setEditor({})}><Plus size={18}/>Добавить актив</button>}</div>}
        {message && <p className="notice" role="status">{message}</p>}
        <Suspense fallback={<div className="panel empty" role="status">Загрузка раздела…</div>}>
        {projected === 'dashboard' && (mode === 'past' && !presentation
          ? <HistoricalHome data={market} date={date} error={marketError}/>
          : <WealthDashboard portfolio={portfolio} metrics={metrics} projection={projection} market={market} error={marketError} today={today} fx={fx} unit={currency} watermark={settings.watermark} future={mode === 'future' || presentation} scenario={scenario}/>)}
        {projected === 'portfolio' && <div className="stack"><PortfolioSettings key={portfolio.id} portfolio={portfolio} save={changePortfolio} create={createPortfolio}/><PositionTable assets={portfolio.assets} fx={fx} edit={asset => setEditor({ asset })} duplicate={asset => setEditor({ asset, duplicate: true })} remove={setPendingRemove}/><FixedIncomeView portfolio={portfolio} start={today}/></div>}
        {projected === 'products' && <div className="stack"><ProductCatalog date={date} archive={mode === 'past'} favorites={favorites} toggle={toggleFavorite}/><SourceDirectory openEditor={() => setEditor({})}/></div>}
        {projected === 'archive' && <div className="stack"><BacktestView key={date.slice(0, 4)} data={market} date={date}/><MarketViews data={market} date={date} error={marketError} archive/><ProductCatalog date={date} archive favorites={favorites} toggle={toggleFavorite}/><ArchiveCoverage date={date}/></div>}
        {projected === 'tax' && <TaxView key={date.slice(0, 4)} data={market} assets={portfolio.assets} projection={projection} defaultYear={Number(date.slice(0, 4))}/>}
        {projected === 'scenarios' && <div className="stack"><ScenarioEditor active={scenario} scenarios={settings.scenarios} edit={(key, value) => setSettings({ ...settings, scenarios: { ...settings.scenarios, [key]: value } })}/><StrategyView portfolios={data.portfolios} active={portfolio} scenarios={settings.scenarios} selected={scenario} fx={fx} today={today} months={months}/></div>}
        {projected === 'market' && <MarketViews data={market} date={date} error={marketError}/>}
        {projected === 'calendar' && <LedgerCalendar key={portfolio.id} projection={projection}/>}
        {projected === 'analytics' && <div className="stack"><div className="segmented analysis-tabs" aria-label="Аналитические инструменты">{[['analyst', 'Аналитик'], ['risk', 'Риски'], ['goals', 'Цели и лестница'], ['report', 'Отчёт'], ['calculator', 'Калькулятор'], ['academy', 'Академия'], ['studio', 'Private Banking Studio'], ['business', 'Capital Business Lab']].map(([key, label]) => <button key={key} aria-pressed={analysisTab === key} onClick={() => setAnalysisTab(key)}>{label}</button>)}</div>
          {analysisTab === 'analyst' && <Analyst p={portfolio} fx={fx} projection={projection}/>}
          {analysisTab === 'risk' && <RiskView portfolio={portfolio} fx={fx} projection={projection}/>}
          {analysisTab === 'goals' && <GoalsAndLadder key={portfolio.id} start={today} initial={projection.opening}/>}
          {analysisTab === 'report' && <ReportView portfolio={portfolio} projection={projection} date={today} fx={fx} watermark={settings.watermark}/>}
          {analysisTab === 'calculator' && <Calculator/>}
          {analysisTab === 'academy' && <Academy/>}
          {analysisTab === 'studio' && <PrivateStudio portfolio={portfolio} fx={fx} start={today} months={months} scenario={scenarioData} watermark={settings.watermark}/>}
          {analysisTab === 'business' && <CapitalBusinessLab/>}
        </div>}
        {projected === 'settings' && <div className="stack"><section className="panel feature-panel"><h2>Оформление</h2><div className="check-list"><label><input type="checkbox" checked={settings.watermark} onChange={e => setSettings({ ...settings, watermark: e.target.checked })}/> Показывать фирменный водяной знак</label></div></section><BackupTools data={data} restore={update} append={assets => changePortfolio({ ...portfolio, assets: [...portfolio.assets, ...assets] })} clear={clearStorage}/></div>}
        </Suspense>
        <footer className="content-footer"><span>Исследовательская версия · оценки портфеля и сценарии зависят от введённых данных</span><span>{missing.length ? `Резервные курсы: ${missing.join(', ')}` : 'Курсы оценки · Банк России'} · бюджет в RUB</span></footer>
      </main>
    </div>
    {editor && <AssetEditor today={today} asset={editor.asset} duplicate={editor.duplicate} close={() => setEditor(null)} save={asset => {
      if ((!editor.asset || editor.duplicate) && portfolio.assets.length >= maxAssets) throw new Error(`Открыто максимальное количество позиций (${maxAssets}).`)
      changePortfolio({ ...portfolio, assets: editor.asset && !editor.duplicate ? portfolio.assets.map(a => a.id === asset.id ? asset : a) : [...portfolio.assets, asset] })
      setEditor(null)
    }}/>}
    {pendingRemove && <ConfirmRemoval asset={pendingRemove} close={() => setPendingRemove(null)} remove={() => { changePortfolio({ ...portfolio, assets: portfolio.assets.filter(a => a.id !== pendingRemove.id) }); setPendingRemove(null) }}/>}
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>)
