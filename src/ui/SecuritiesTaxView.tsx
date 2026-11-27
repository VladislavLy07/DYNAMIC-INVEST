import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { currencies, type Currency } from '../finance/model'
import { passiveIncomeSource, russianDividendTax, securitiesSource, securitiesTax, securityNames, type SecurityIncome, type TaxableSecurityEvent } from '../tax/securities'
import type { Snapshot } from '../market/snapshot'
import { rub } from './format'

function newEvent(year: number): TaxableSecurityEvent {
  return { kind: 'sale', proceeds: { date: `${year}-01-01`, currency: 'RUB', amount: 0 },
    basis: { date: `${year - 1}-01-01`, currency: 'RUB', amount: 0 }, expensesRub: 0 }
}

export function SecuritiesTaxView({ data, defaultYear }: { data?: Snapshot; defaultYear: number }) {
  const [year, setYear] = useState(defaultYear === 2025 ? 2025 : 2026)
  const [entries, setEntries] = useState(() => [newEvent(year)])
  const [loss, setLoss] = useState(0)
  const [otherBase, setOtherBase] = useState(0)
  const [withholding, setWithholding] = useState(0)
  const [supported, setSupported] = useState(true)
  const estimate = securitiesTax({ year, resident: supported, events: entries, compatibleLoss: loss, otherBase, withholding }, data)
  const update = (index: number, entry: TaxableSecurityEvent) => setEntries(current => current.map((item, i) => i === index ? entry : item))
  return <div className="two-column">
    <section className="panel feature-panel stack">
      <div className="panel-heading"><div><h2>НДФЛ по биржевым ценным бумагам</h2><p>Продажа акций и паёв, купоны и погашение облигаций. Один совместимый набор операций.</p></div></div>
      <div className="field-grid">
        <label>Год реализации<select value={year} onChange={e => { const next = Number(e.target.value); setYear(next); setEntries(current => current.map(entry => ({ ...entry, proceeds: { ...entry.proceeds, date: `${next}-01-01` } }))) }}><option>2025</option><option>2026</option></select></label>
        <label>Удержано брокером, ₽<input type="number" min={0} value={withholding} onChange={e => setWithholding(e.target.valueAsNumber || 0)}/></label>
        <label>Подтверждённый совместимый убыток, ₽<input type="number" min={0} value={loss} onChange={e => setLoss(e.target.valueAsNumber || 0)}/></label>
        <label>Остальная совместно облагаемая база, ₽<input type="number" min={0} value={otherBase} onChange={e => setOtherBase(e.target.valueAsNumber || 0)}/></label>
      </div>
      <label className="inline-field secondary"><input type="checkbox" checked={supported} onChange={e => setSupported(e.target.checked)}/> Резидент РФ. Введена одна совместимая база по обращающимся бумагам вне ИИС</label>
      {entries.map((entry, i) => <fieldset className="source-card" key={i}><legend>Операция {i + 1}</legend>
        <div className="field-grid export-fields">
          <label>Вид<select value={entry.kind} onChange={e => {
            const kind = e.target.value as SecurityIncome
            update(i, { ...entry, kind, basis: kind === 'coupon' ? undefined : entry.basis ?? newEvent(year).basis })
          }}>{Object.entries(securityNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
          <label>Дата выплаты или продажи<input type="date" min={`${year}-01-01`} max={`${year}-12-31`} value={entry.proceeds.date} onChange={e => update(i, { ...entry, proceeds: { ...entry.proceeds, date: e.target.value } })}/></label>
          <label>Доход операции<input type="number" min={0} step=".01" value={entry.proceeds.amount} onChange={e => update(i, { ...entry, proceeds: { ...entry.proceeds, amount: e.target.valueAsNumber || 0 } })}/></label>
          <label>Валюта дохода<select value={entry.proceeds.currency} onChange={e => update(i, { ...entry, proceeds: { ...entry.proceeds, currency: e.target.value as Currency } })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
          {entry.basis && <>
            <label>Дата расхода<input type="date" max={entry.proceeds.date} value={entry.basis.date} onChange={e => update(i, { ...entry, basis: { ...entry.basis!, date: e.target.value } })}/></label>
            <label>Стоимость приобретения<input type="number" min={0} step=".01" value={entry.basis.amount} onChange={e => update(i, { ...entry, basis: { ...entry.basis!, amount: e.target.valueAsNumber || 0 } })}/></label>
            <label>Валюта расхода<select value={entry.basis.currency} onChange={e => update(i, { ...entry, basis: { ...entry.basis!, currency: e.target.value as Currency } })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
          </>}
          <label>Иные подтверждённые расходы, ₽<input type="number" min={0} step=".01" value={entry.expensesRub} onChange={e => update(i, { ...entry, expensesRub: e.target.valueAsNumber || 0 })}/></label>
        </div>
        {entries.length > 1 && <button className="button quiet" onClick={() => setEntries(values => values.filter((_, index) => index !== i))}><Trash2 size={15}/>Удалить операцию</button>}
      </fieldset>)}
      {entries.length < 20 && <button className="button quiet" onClick={() => setEntries([...entries, newEvent(year)])}><Plus size={15}/>Добавить операцию</button>}
    </section>
    <section className="panel feature-panel stack" aria-live="polite"><h2>Расчёт по ценным бумагам</h2>
      {estimate.error ? <p className="notice">{estimate.error}</p> : <>
        <div className="large-result">{rub(estimate.tax!)}</div>
        <dl className="result-list">{[
          ['Финансовый результат', estimate.financialResult], ['Использован совместимый убыток', estimate.offset], ['База', estimate.taxable],
          ['Остаток к уплате', estimate.payable], ['Удержано сверх оценки', estimate.estimatedOverpayment], ['Убыток текущего периода', estimate.retainedLoss],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{rub(Number(value))}</dd></div>)}</dl>
        <div className="table-scroll"><table><thead><tr><th>№</th><th>Доход</th><th>Затраты</th><th>Результат</th><th>Даты курсов ЦБ</th></tr></thead><tbody>{estimate.rows?.map((row, i) => <tr key={i}><td>{i + 1}</td><td>{rub(row.proceeds)}</td><td>{rub(row.cost + row.expenses)}</td><td>{rub(row.result)}</td><td>{row.proceedsRateDate} / {row.costRateDate ?? '—'}</td></tr>)}</tbody></table></div>
      </>}
      <p className="secondary">Ставки 13% и 15%. Порог 2,4 млн ₽ уже может быть частично занят совместимой базой. Для иностранных сумм курс применяется отдельно к расходу и доходу. Введите затраты по реализованной части. НКД и комиссии вносите один раз.</p>
      <p className="secondary">Дивиденды, ИИС, льготы, необращающиеся бумаги, ЦФА и драгметаллы требуют отдельных правил. Остаток по модели сверяется с брокерскими документами.</p>
      <div><a className="text-link" href={securitiesSource} rel="noreferrer" target="_blank">ФНС · пример реализации</a>{' · '}<a className="text-link" href={passiveIncomeSource} rel="noreferrer" target="_blank">ФНС · шкала</a></div>
    </section>
  </div>
}

export function DividendTaxView({ defaultYear }: { defaultYear: number }) {
  const [year, setYear] = useState(defaultYear === 2025 ? 2025 : 2026)
  const [gross, setGross] = useState(0)
  const [withheld, setWithheld] = useState(0)
  const result = russianDividendTax(year, gross, withheld)
  return <div className="two-column">
    <section className="panel feature-panel stack"><h2>НДФЛ по российским дивидендам</h2><p className="secondary">Оценка годовой базы для налогового резидента РФ.</p>
      <div className="field-grid"><label>Год выплаты<select value={year} onChange={e => setYear(Number(e.target.value))}><option>2025</option><option>2026</option></select></label>
        <label>Облагаемая сумма дивидендов, ₽<input type="number" min={0} value={gross} onChange={e => setGross(e.target.valueAsNumber || 0)}/></label>
        <label>Уже удержано, ₽<input type="number" min={0} value={withheld} onChange={e => setWithheld(e.target.valueAsNumber || 0)}/></label></div>
      <p className="secondary">Дивиденды образуют отдельную базу. Здесь не учитываются иностранные выплаты, зачёты налогов или вычеты.</p>
      <a className="text-link" href="https://www.nalog.gov.ru/rn07/promo/new2025/" target="_blank" rel="noreferrer">ФНС · дивиденды и шкала НДФЛ</a>
    </section>
    <section className="panel feature-panel" aria-live="polite"><h2>Оценка налога по дивидендам</h2>{result ? <><div className="large-result">{rub(result.tax)}</div><dl className="result-list"><div><dt>Остаток к уплате</dt><dd>{rub(result.payable)}</dd></div><div><dt>Дивиденды после налога</dt><dd>{rub(result.net)}</dd></div></dl></> : <p className="notice">Проверьте введённые суммы.</p>}</section>
  </div>
}
