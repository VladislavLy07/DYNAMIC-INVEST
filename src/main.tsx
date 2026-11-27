import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, BriefcaseBusiness, Calculator as CalculatorIcon, CalendarDays, ChartNoAxesCombined, FlaskConical, LayoutDashboard, Menu, Moon, Plus, Sun, X } from 'lucide-react'
import { portfolioInsight } from './analytics/insights'
import { demoMarket } from './data/demo'
import { loadPortfolio, savePortfolio } from './data/portfolio'
import { dateKey } from './finance/engine'
import type { Asset } from './finance/model'
import { Calculator } from './ui/Calculator'
import { Calendar } from './ui/Calendar'
import { Dashboard } from './ui/Dashboard'
import { AssetEditor, Portfolio } from './ui/Portfolio'
import { Scenarios } from './ui/Scenarios'
import './style.css'

const today = dateKey()
const fx = demoMarket.fx
const pages = {
  dashboard: { label: 'Обзор', title: 'Обзор капитала', subtitle: 'Структура портфеля, доходность и ближайшие поступления', icon: LayoutDashboard },
  portfolio: { label: 'Портфель', title: 'Инвестиционный портфель', subtitle: 'Управляйте позициями и параметрами инвестиционных инструментов', icon: BriefcaseBusiness },
  calculator: { label: 'Калькулятор', title: 'Калькулятор доходности', subtitle: 'Рассчитайте эффект ставки, капитализации, инфляции и условного налога', icon: CalculatorIcon },
  calendar: { label: 'Календарь выплат', title: 'Календарь денежных потоков', subtitle: 'Планируйте поступления по месяцам и годам', icon: CalendarDays },
  scenarios: { label: 'Сценарии', title: 'Лаборатория сценариев', subtitle: 'Сравните капитал в трёх экономических сценариях', icon: FlaskConical },
}
type Page = keyof typeof pages
const pageKeys = Object.keys(pages) as Page[]
const currentPage = (): Page => {
  const path = location.hash.slice(1) as Page
  return pageKeys.includes(path) ? path : 'dashboard'
}

function initialTheme() {
  try { return localStorage.getItem('dynamic-invest:theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

function App() {
  const [page, setPage] = useState(currentPage)
  const [theme, setTheme] = useState(initialTheme)
  const [drawer, setDrawer] = useState(false)
  const [portfolio, setPortfolio] = useState(() => loadPortfolio(today))
  const [editor, setEditor] = useState<{ asset?: Asset } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<Asset | null>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const onHash = () => { setPage(currentPage()); setDrawer(false); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('dynamic-invest:theme', theme) } catch { /* Theme remains active for this session. */ }
  }, [theme])
  useEffect(() => { if (pendingRemove) deleteDialog.current?.showModal() }, [pendingRemove])

  function updateAssets(assets: Asset[]) {
    let message = ''
    try { savePortfolio(assets) } catch { message = 'Не удалось сохранить изменения в браузере. Они доступны до закрытия страницы.' }
    setPortfolio({ assets, message })
  }

  const active = pages[page]
  const { assets, message } = portfolio

  return <div className="app-shell">
    {drawer && <button className="drawer-overlay" aria-label="Закрыть меню" onClick={() => setDrawer(false)}/>}
    <aside className={`sidebar ${drawer ? 'drawer-open' : ''}`}>
      <a href="#dashboard" className="brand" onClick={() => setDrawer(false)}><span className="brand-mark"><ChartNoAxesCombined size={24} strokeWidth={2.4}/></span><span><b>DYNAMIC<span> INVEST</span></b><small>WEALTH MANAGEMENT</small></span></a>
      <nav aria-label="Основная навигация">
        <div className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        {pageKeys.map(key => {
          const { label, icon: Icon } = pages[key]
          return <a key={key} href={`#${key}`} aria-current={key === page ? 'page' : undefined} onClick={() => setDrawer(false)}><Icon size={19} strokeWidth={1.8}/>{label}</a>
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="workspace"><span className="workspace-icon"><Activity size={18}/></span><div><b>Демопортфель</b><span>Локальное хранилище</span></div></div>
        <div className="version"><span>DYNAMIC INVEST</span><span>v1.0</span></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-button menu-button" aria-label="Открыть меню" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>{drawer ? <X size={20}/> : <Menu size={20}/>}</button><span>Рабочее пространство</span><span className="crumb-sep">/</span><b>{active.label}</b></div>
        <div className="top-actions"><span className="demo-badge"><span/>Демо-данные</span><button className="icon-button theme-button" aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button></div>
      </header>
      <main>
        <div className="page-heading">
          <div><h1>{active.title}</h1><p>{active.subtitle}</p></div>
          {(page === 'dashboard' || page === 'portfolio') && <button className="button primary" onClick={() => setEditor({})}><Plus size={18}/>Добавить актив</button>}
        </div>
        {message && <p className="notice" role="status">{message}</p>}
        {page === 'dashboard' && <Dashboard assets={assets} fx={fx} today={today} openCalendar={() => { location.hash = 'calendar' }}/>}
        {page === 'portfolio' && <Portfolio assets={assets} fx={fx} edit={asset => setEditor({ asset })} remove={setPendingRemove}/>}
        {page === 'calculator' && <Calculator/>}
        {page === 'calendar' && <Calendar assets={assets} fx={fx} today={today}/>}
        {page === 'scenarios' && <Scenarios assets={assets} fx={fx} today={today}/>}
        {page === 'dashboard' && <section className="panel feature-panel methodology insight"><div className="panel-heading"><div><h2>Структура и концентрация</h2><p>Аналитические правила · AI не подключён</p></div></div><p>{portfolioInsight(assets, fx, today)}</p></section>}
        <footer className="content-footer"><span>{demoMarket.source} · {demoMarket.asOf} UTC · USD {fx.USD} ₽ · CNY {fx.CNY} ₽ · EUR {fx.EUR} ₽</span><span>Базовая валюта · RUB</span></footer>
      </main>
    </div>
    {editor && <AssetEditor today={today} asset={editor.asset} close={() => setEditor(null)} save={asset => {
      updateAssets(editor.asset ? assets.map(item => item.id === asset.id ? asset : item) : [...assets, asset])
      setEditor(null)
    }}/>}
    {pendingRemove && <dialog ref={deleteDialog} className="panel dialog delete-dialog" onCancel={event => { event.preventDefault(); setPendingRemove(null) }} aria-labelledby="delete-title">
      <h2 id="delete-title">Удалить актив?</h2><p>«{pendingRemove.name}» будет удалён из портфеля и расчётов.</p>
      <div className="form-actions"><button className="button quiet" autoFocus onClick={() => setPendingRemove(null)}>Отмена</button><button className="button remove" onClick={() => { updateAssets(assets.filter(asset => asset.id !== pendingRemove.id)); setPendingRemove(null) }}>Удалить</button></div>
    </dialog>}
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>)
