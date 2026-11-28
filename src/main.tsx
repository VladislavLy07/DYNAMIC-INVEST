import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings } from 'lucide-react'
import { dateKey } from './finance/engine'
import { slideHorizons, type SlideHorizon, type SlideInput } from './finance/miniSlides'
import { validDate } from './finance/model'
import type { BankParameters } from './finance/bankSlides'
import { InvestmentSlides, Link, displayDate, duration } from './ui/InvestmentSlides'
import { ProductCatalog } from './ui/ProductCatalog'
import { taxSource } from './tax/deposits'
import './single-page.css'

export function SinglePageApp() {
  const [today] = useState(() => dateKey())
  const [year, setYear] = useState('today')
  const [historicalDate, setHistoricalDate] = useState('')
  const [amount, setAmount] = useState('1000000')
  const [months, setMonths] = useState<SlideHorizon>(12)
  const [allowanceUsed, setAllowanceUsed] = useState(false)
  const [assumedAllowance, setAssumedAllowance] = useState('160000')
  const [otherBase, setOtherBase] = useState('0')
  const [qualifies, setQualifies] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const endOfYear = year < today.slice(0, 4) ? year + '-12-31' : today
  const date = year === 'today' ? today : historicalDate || endOfYear
  const bankInput: BankParameters = { amount: Number(amount), date, months, allowanceUsed, assumedAllowance: Number(assumedAllowance), otherBase: Number(otherBase), qualifies }
  const investmentInput: SlideInput = { amount: bankInput.amount, months, model: 'resident', otherBase: bankInput.otherBase, start: date }

  return <main className="single-page" data-app="SinglePageApp">
    <header className="catalog-header">
      <h1><img src={import.meta.env.BASE_URL + 'brand/logo-light.svg'} alt="DYNAMIC INVEST" width="234" height="52"/></h1>
    </header>
    <section className="catalog-controls" aria-label="Общие параметры расчёта">
      <label><span>Исторический год</span>
        <select aria-label="Исторический год" value={year} onChange={event => { setYear(event.target.value); setHistoricalDate('') }}>
          <option value="today">Последние</option>
          {[2026, 2025, 2024, 2023].filter(value => value <= Number(today.slice(0, 4))).map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label><span>Сумма размещения, ₽</span>
        <input type="number" min=".01" max="1000000000" step=".01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)}/>
      </label>
      <div className="tax-field">
        <span id="tax-label">Лимит НДФЛ по вкладам</span>
        <div className="tax-switch" role="group" aria-labelledby="tax-label">
          <button type="button" aria-pressed={!allowanceUsed} onClick={() => setAllowanceUsed(false)}>Лимит свободен</button>
          <button type="button" aria-pressed={allowanceUsed} onClick={() => setAllowanceUsed(true)}>Лимит использован</button>
        </div>
      </div>
      <label><span>Горизонт</span>
        <select aria-label="Горизонт" value={months} onChange={event => setMonths(Number(event.target.value) as SlideHorizon)}>
          {slideHorizons.map(value => <option key={value} value={value}>{duration[value]}</option>)}
        </select>
      </label>
      <button className="calc-settings" type="button" aria-expanded={showSettings} aria-controls="settings-fields"
        aria-label="Параметры расчёта" title="Параметры расчёта" onClick={() => setShowSettings(value => !value)}><Settings size={19} aria-hidden="true"/></button>
      <div id="settings-fields" className="settings-fields" hidden={!showSettings}>
        {year !== 'today' && <label><span>Дата наблюдения</span><input type="date" min={year + '-01-01'} max={endOfYear} value={date}
          onChange={event => { const next = event.target.value; if (validDate(next) && next.startsWith(year + '-') && next <= endOfYear) setHistoricalDate(next) }}/></label>}
        <label><span>Расчётный лимит для неполного года, ₽</span>
          <input type="number" min="0" max="1000000" step="1000" value={assumedAllowance} onChange={event => setAssumedAllowance(event.target.value)}/>
        </label>
        <label><span>Прочая совместимая налоговая база, ₽</span>
          <input type="number" min="0" max="1000000000000" step=".01" value={otherBase} onChange={event => setOtherBase(event.target.value)}/>
        </label>
        <label className="condition-check"><input type="checkbox" checked={qualifies} onChange={event => setQualifies(event.target.checked)}/>
          <span>Рассчитать вариант с выполнением условий банка</span></label>
      </div>
    </section>
    <ProductCatalog input={bankInput} historical={year !== 'today'}/>
    <InvestmentSlides input={investmentInput} date={date}/>
    <footer className="catalog-footer">
      <h2>Источники и дата обновления</h2>
      <p>Банковские наблюдения проверены {displayDate('2026-11-28')}. Снимок раскрытий по фондам проверен {displayDate('2026-11-27')}.</p>
      <ul>
        <li><Link href="https://www.psbank.ru/personal/saving">ПСБ · вклады</Link></li>
        <li><Link href="https://www.psbank.ru/personal/savingsaccount">ПСБ · накопительные счета</Link></li>
        <li><Link href="https://www.upravlyaem.ru/disclosure/mutual_funds/">УК ПСБ · открытые фонды</Link></li>
        <li><Link href="https://www.upravlyaem.ru/disclosure/BPIF/">УК ПСБ · биржевые фонды</Link></li>
        <li><Link href={taxSource}>ФНС · банковские проценты</Link></li>
      </ul>
    </footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<SinglePageApp/>)
