import { useMemo, useState } from 'react'
import { Calculator, CircleHelp } from 'lucide-react'
import { availableAt, type Snapshot } from '../market/snapshot'
import { bankInterestByAsset, depositTax, nonresidentSource, taxRules, taxSource, type DepositCarryover } from '../tax/deposits'
import type { Asset } from '../finance/model'
import type { Projection } from './CapitalChart'
import { percent, rub } from './format'

export function TaxView({ data, assets, projection, defaultYear }: { data?: Snapshot; assets: Asset[]; projection: Projection; defaultYear: number }) {
  const [year, setYear] = useState(taxRules.some(rule => rule.year === defaultYear) ? defaultYear : 2026)
  const [residency, setResidency] = useState<'resident' | 'nonresident'>('resident')
  const [entries, setEntries] = useState([0])
  const [other, setOther] = useState(0)
  const [shared, setShared] = useState(0)
  const [customRate, setCustomRate] = useState('')
  const flat = residency === 'nonresident' && year >= 2025
  const [useForecast, setUseForecast] = useState(false)
  const [exception, setException] = useState(false)
  const [useCarryover, setUseCarryover] = useState(false)
  const [carryover, setCarryover] = useState<DepositCarryover>({ opened: '', paid: '', paidAtMaturityOnly: false, confirmed: false, amount: 0, eligibleAccrued: 0 })
  const rates = useMemo(() => Array.from({ length: 12 }, (_, month) => availableAt(data?.sources.key, `${year}-${String(month + 1).padStart(2, '0')}-01`))
    .filter(value => value && data?.sources.key?.series.at(-1)?.date && value.date <= data.sources.key.series.at(-1)!.date), [data, year])
  const knownRates = rates.filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
  const snapThrough = data?.sources.key?.series.at(-1)?.date
  const asOf = snapThrough?.startsWith(String(year)) ? snapThrough.slice(5, 7) : '12'
  const assumed = knownRates.length ? Math.max(...knownRates.slice(0, Number(asOf)).map(rate => rate.value)) : undefined
  const estimate = bankInterestByAsset(assets, projection.events, year)
  const rate = customRate !== '' ? Number(customRate) : assumed
  const result = exception ? null : depositTax(year, [...entries, ...(useForecast ? estimate.map(row => row.amount) : [])], other, shared, residency, rate, useCarryover ? carryover : null)
  return <div className="two-column">
    <section className="panel feature-panel">
      <div className="panel-heading"><div><h2>НДФЛ на банковские проценты</h2><p>Обычные рублёвые вклады и счета в российских банках</p></div><span className="tile blue"><Calculator size={17}/></span></div>
      <div className="field-grid">
        <label>Налоговый год<select value={year} onChange={e => { setYear(Number(e.target.value)); setCustomRate('') }}>{taxRules.map(rule => <option key={rule.year}>{rule.year}</option>)}</select></label>
        <label>Налоговое резидентство<select value={residency} onChange={e => setResidency(e.target.value as typeof residency)}><option value="resident">Резидент РФ</option><option value="nonresident">Нерезидент РФ</option></select></label>
        {entries.map((amount, index) => <label key={index}>Проценты по вкладу №{index + 1}, ₽<input type="number" min={0} max={1e12} value={amount} onChange={e => setEntries(current => current.map((n, i) => index === i ? Math.max(0, Number(e.target.value)) : n))}/></label>)}
        {entries.length < 10 && <button className="button quiet align-end" onClick={() => setEntries([...entries, 0])}>Добавить вклад</button>}
        <label>Проценты по другим счетам, ₽<input type="number" value={other} onChange={e => setOther(Math.max(0, Number(e.target.value)))} min={0}/></label>
        <label>Прочая совместная налоговая база, ₽<input type="number" disabled={flat} value={shared} onChange={e => setShared(Math.max(0, Number(e.target.value)))} min={0}/></label>
        {year === 2026 && <label>Допущение о максимальной ключевой ставке, %<input type="number" min={0} max={100} step=".01" placeholder={assumed?.toString() ?? 'Нет данных'} value={customRate} onChange={e => setCustomRate(e.target.value)}/></label>}
      </div>
      <div className="check-list"><label><input type="checkbox" checked={useForecast} onChange={e => setUseForecast(e.target.checked)}/> Добавить прогноз выплат из портфеля ({estimate.length} позиций)</label>
        <label><input type="checkbox" checked={exception} onChange={e => setException(e.target.checked)}/> Есть эскроу или иные особенности, которые не учтены во введённых суммах</label></div>
      <details className="contract-fields"><summary>Перенос лимита по долгосрочному вкладу</summary>
        <div className="check-list"><label><input type="checkbox" checked={useCarryover} onChange={e => setUseCarryover(e.target.checked)}/> Учесть подтверждённый остаток за прошлые годы</label></div>
        {useCarryover && <>
          <div className="field-grid">
            <label>Дата открытия<input type="date" value={carryover.opened} onChange={e => setCarryover({ ...carryover, opened: e.target.value })}/></label>
            <label>Дата закрытия и выплаты<input type="date" value={carryover.paid} onChange={e => setCarryover({ ...carryover, paid: e.target.value })}/></label>
            <label>Остаток по данным ФНС, ₽<input type="number" value={carryover.amount} min={0} max={1e12} onChange={e => setCarryover({ ...carryover, amount: Math.max(0, Number(e.target.value)) })}/></label>
            <label>Проценты за прошлые годы из текущей выплаты, ₽<input type="number" min={0} max={1e12} value={carryover.eligibleAccrued} onChange={e => setCarryover({ ...carryover, eligibleAccrued: Math.max(0, Number(e.target.value)) })}/></label>
          </div>
          <div className="check-list"><label><input type="checkbox" checked={carryover.paidAtMaturityOnly} onChange={e => setCarryover({ ...carryover, paidAtMaturityOnly: e.target.checked })}/> По договору проценты выплачиваются только в конце</label>
            <label><input type="checkbox" checked={carryover.confirmed} onChange={e => setCarryover({ ...carryover, confirmed: e.target.checked })}/> Остаток подтверждён ФНС, разбивка начислений подтверждена банком</label></div>
          <p className="secondary">Включите полученные проценты по договору в общий доход выше. Используйте этот блок для одного вклада с подтверждёнными суммами.</p>
        </>}
      </details>
      {useForecast && <ul className="tax-estimate">{estimate.map((row, index) => <li key={index}>{row.name} <strong>{rub(row.amount)}</strong></li>)}</ul>}
    </section>
    <section className="panel feature-panel" aria-live="polite">
      <div className="panel-heading"><div><h2>Расчётный налог</h2><p>{result?.provisional ? 'Предварительно · ставка введена или рассчитана по части года' : 'Статья 214.2 НК РФ'}</p></div></div>
      {result ? <><div className="large-result">{rub(result.tax)}</div><dl className="result-list">{[
        ['Совокупные проценты', rub(result.gross)], ['Необлагаемая сумма', rub(result.exemption)], ['Применённый перенос', rub(result.transferred)], ['Налоговая база', rub(result.taxable)], ['Чистый доход', rub(result.net)],
        ['Структура ставки', result.flat ? '15 % для нерезидента' : '13 % / 15 % по порогу'], ['Эффективная ставка', result.effective === null ? '—' : percent(result.effective)], ['Срок уплаты', 'До 1 декабря ' + result.dueYear + ' с учётом переноса'],
      ].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="secondary">Налоговый резерв равен рассчитанному налогу. Сумма не списывается из портфеля автоматически.</p></>
        : <p className="empty">{exception ? 'Для исключения нужны отдельные сведения и проверка условий.' : useCarryover ? 'Проверьте даты, выплату в конце срока и подтверждение ФНС. Срок вклада должен быть больше 15 месяцев.' : 'Для выбранных параметров расчёт недоступен.'}</p>}
    </section>
    <section className="panel feature-panel full-width methodology"><h2><CircleHelp size={18}/> Методика</h2><p>Совокупный доход уменьшается на единый лимит для всех банков. Лимит равен 1 млн ₽, умноженному на максимум ключевой ставки на первые числа месяцев. Используются ставки 13 % и 15 % для соответствующей части базы. Укажите только те базы, которые действительно совместно учитываются.</p><p>Для долгосрочного вклада доступен расчёт при подтверждённом остатке и разбивке начислений. Валютные проценты и инвестиционные налоговые базы требуют дополнительных правил. Прогноз из портфеля рассчитывается от текущей даты. Исторические фактические суммы вводятся вручную.</p><p><a className="text-link" href={result?.flat ? nonresidentSource : result?.rule.source ?? taxSource} target="_blank" rel="noreferrer">Методика ФНС России</a></p></section>
  </div>
}
