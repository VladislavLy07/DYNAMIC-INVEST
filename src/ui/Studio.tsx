import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { concentration } from '../analytics/wealth'
import { businessCase, type BusinessInputs } from '../features/business'
import { assumptions, type ScenarioInput } from '../features/scenarios'
import { money, projectLedger } from '../finance/ledger'
import type { FxRates } from '../finance/model'
import { available, type Portfolio } from '../portfolio/workspace'
import { downloadFile } from '../reporting/files'
import { CapitalChart } from './CapitalChart'
import { percent, rub } from './format'

const caseSizes = [500_000, 1_500_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000]

export function PrivateStudio({ portfolio, fx, start, months, scenario, watermark }: {
  portfolio: Portfolio; fx: FxRates; start: string; months: number; scenario: ScenarioInput; watermark: boolean
}) {
  const [capital, setCapital] = useState(5_000_000)
  const [reserve, setReserve] = useState(25)
  const [target, setTarget] = useState(50_000)
  const [need, setNeed] = useState(250_000)
  const variants = useMemo(() => {
    const source = portfolio.assets.reduce((sum, a) => sum + a.amount * fx[a.currency], 0) + available(portfolio)
    return [0, reserve].map((share, index) => {
      const amount = capital * (1 - share / 100)
      const scale = source > 0 ? amount / source : 0
      const assets = portfolio.assets.flatMap(asset => {
        const reduced = money(asset.amount * scale)
        if (!reduced) return []
        const c = asset.contract
        return [{ ...asset, amount: reduced, cost: Math.max(.01, money(asset.cost * scale)), contract: c && {
          ...c, principal: c.principal === undefined ? undefined : money(c.principal * scale),
          movements: c.movements?.map(m => ({ ...m, amount: money(m.amount * scale) })),
          schedule: c.schedule?.map(row => ({ date: row.date, income: money(row.income * scale), principal: money(row.principal * scale) })),
        } }]
      })
      const liquid = Math.max(0, money(capital - assets.reduce((sum, a) => sum + money(a.amount * fx[a.currency]), 0)))
      const model = { ...portfolio, assets, budget: capital, contribution: 0, withdrawal: 0 }
      const result = projectLedger(assets, fx, start, months, liquid, assumptions(scenario, model, fx))
      const top = concentration(model, fx).issuers[0]
      return { label: index === 0 ? 'Текущая структура' : 'С повышенным резервом', liquid, result, monthly: result.totals.paid / months,
        concentration: top && result.opening > 0 ? top[1] / result.opening : null }
    })
  }, [capital, fx, months, portfolio, reserve, scenario, start])
  const [first, second] = variants
  function exportProposal() {
    const sections = [
      'DYNAMIC INVEST · Демонстрационное финансовое предложение', `Дата ${start}. Горизонт ${months} мес. Начальный капитал ${rub(capital)}.`,
      `Цель по выплатам ${rub(target)} / мес. Потребность в свободных средствах ${rub(need)}.`,
      ...variants.map(v => `${v.label}. Прогноз капитала ${rub(v.result.final.value)}, валовая прибыль ${rub(v.result.totals.gross)}, чистая прибыль ${rub(v.result.totals.net)}, ежемесячный доход ${rub(v.monthly)}, свободные средства ${rub(v.liquid)}. Условный налог ${rub(v.result.totals.assessed)} и комиссии ${rub(v.result.totals.fees)}.`),
      'Допущения: модель масштабирует введённые позиции. Доступность условий, лимиты, реальные ставки, комиссии и налоги уточняются по официальным документам.',
      'Вопросы для обсуждения: какая часть капитала должна оставаться доступной, какие выплаты обязательны и какие условия выхода подтверждены?',
    ]
    downloadFile('dynamic-invest-proposal.txt', sections.join('\n\n'), 'text/plain;charset=utf-8')
  }
  return <div className="stack report-view">
    <section className={'panel feature-panel' + (watermark ? ' watermarked' : '')}>
      <div className="panel-heading"><div><h2>Private Banking Studio</h2><p>Обезличенное сравнение пропорционально масштабирует позиции активного портфеля.</p></div><div className="toolbar wrap no-print"><button className="button primary" onClick={exportProposal}><Download size={16}/>Сформировать предложение</button><button className="button quiet" onClick={() => window.print()}><Printer size={16}/>Печать / PDF</button></div></div>
      <div className="field-grid portfolio-fields no-print">
        <label>Готовый кейс<select value={caseSizes.includes(capital) ? capital : 'custom'} onChange={e => { if (e.target.value !== 'custom') setCapital(Number(e.target.value)) }}><option value="custom">Пользовательский</option>{caseSizes.map(amount => <option key={amount} value={amount}>{rub(amount)}</option>)}</select></label>
        <label>Капитал, ₽<input type="number" min={0} max={1e12} value={capital} onChange={e => setCapital(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label>
        <label>Дополнительная доля свободных средств, %<input type="number" min={0} max={100} value={reserve} onChange={e => setReserve(Math.min(100, Math.max(0, Number(e.target.value))))}/></label>
        <label>Потребность в выплатах в месяц, ₽<input type="number" min={0} max={1e12} value={target} onChange={e => setTarget(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label>
        <label>Требуемые доступные средства, ₽<input type="number" min={0} max={1e12} value={need} onChange={e => setNeed(Math.min(1e12, Math.max(0, Number(e.target.value))))}/></label>
      </div>
      <div className="table-scroll quality-table"><table><thead><tr><th>Вариант</th><th>Прогноз капитала</th><th>Чистый результат</th><th>Выплаты / мес.</th><th>Свободные средства</th><th>Наибольшая доля</th><th>Условный налог</th></tr></thead><tbody>{variants.map(v => <tr key={v.label}><td><b>{v.label}</b></td><td>{rub(v.result.final.value)}</td><td>{rub(v.result.totals.net)}</td><td>{rub(v.monthly)}</td><td>{rub(v.liquid)}</td><td>{v.concentration === null ? '—' : percent(v.concentration)}</td><td>{scenario.tax ? rub(v.result.totals.assessed) : '—'}</td></tr>)}</tbody></table></div>
      <p className="secondary">Вариант с резервом изменяет свободные средства на {rub(second.liquid - first.liquid)}, а среднемесячные выплаты на {rub(second.monthly - first.monthly)}. {second.liquid < need ? 'Ликвидности ниже заданной цели. ' : 'Цель по свободным средствам достигается в модели. '}{second.monthly < target ? 'Прогноз выплат ниже цели.' : 'Прогноз выплат достигает цели.'}</p>
      <p className="secondary">Проверьте минимальные суммы, сегмент, действующие условия выхода, применимость комиссий и налогов. Расчёты не подтверждают условия конкретного банка.</p>
    </section>
    <CapitalChart projection={second.result} unit="RUB" rate={1}/>
  </div>
}

const names = ['Контакты', 'Переговоры', 'Заинтересованные обращения', 'Предложения', 'Привлечённые клиенты']
const inputs = [
  ['contacts', 'Контакты'], ['averageTicket', 'Средний капитал, ₽'], ['outflows', 'Изъятия из AUM, ₽'], ['initialAum', 'AUM на начало, ₽'],
  ['managementRate', 'Ставка комиссии, %'], ['fixedCosts', 'Фиксированные расходы, ₽'], ['acquisitionCost', 'Цена контакта, ₽'],
  ['salary', 'Оклад за период, ₽'], ['variableShare', 'Доля комиссии, %'],
] as const

export function CapitalBusinessLab() {
  const [data, setData] = useState<BusinessInputs>({ contacts: 300, conversion: [30, 60, 65, 30], averageTicket: 1_000_000, outflows: 2_000_000,
    initialAum: 50_000_000, managementRate: 1.5, fixedCosts: 180_000, acquisitionCost: 450, salary: 420_000, variableShare: 18 })
  const model = businessCase(data)
  return <section className="panel feature-panel stack"><div className="panel-heading"><div><h2>Capital Business Lab</h2><p>Условные годовые допущения, независимые от конкретной организации</p></div></div>
    <div className="field-grid portfolio-fields">{inputs.map(([key, label]) => <label key={key}>{label}<input type="number" min={0} max={key === 'managementRate' || key === 'variableShare' ? 100 : 1e12} value={data[key]} onChange={e => setData({ ...data, [key]: Math.min(Number(e.target.max), Math.max(0, Number(e.target.value))) })}/></label>)}</div>
    <dl className="ledger-summary">{model.funnel.map((value, i) => <div key={names[i]}><dt>{names[i]}</dt><dd>{value.toLocaleString('ru', {maximumFractionDigits: 1})}</dd>{i > 0 && <label className="secondary">Конверсия, %<input type="number" min={0} max={100} value={data.conversion[i - 1]} onChange={e => setData({ ...data, conversion: data.conversion.map((p, index) => index === i - 1 ? Math.min(100, Math.max(0, Number(e.target.value))) : p) })}/></label>}</div>)}</dl>
    <dl className="ledger-summary">{[['Привлечено', model.recruited], ['Net New Money', model.nnm], ['AUM на конец', model.aum], ['Комиссии', model.commission], ['Затраты на привлечение', model.acquisition], ['AUM безубыточности при окладе', model.breakEvenAum]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null ? '—' : rub(Number(value))}</dd></div>)}</dl>
    <div className="table-scroll"><table><thead><tr><th>Модель</th><th>Вознаграждение</th><th>Результат бизнеса</th></tr></thead><tbody>{['Фиксированный оклад', 'Оклад + процент', 'Процент с зачётом оклада'].map((name, i) => <tr key={name}><td>{name}</td><td>{rub(model.payout[i].remuneration)}</td><td>{rub(model.payout[i].businessNet)}</td></tr>)}</tbody></table></div>
    <p className="secondary">Комиссия начисляется на среднее начального и конечного AUM. Дробные результаты воронки выражают ожидаемое число при введённых конверсиях.</p>
  </section>
}
