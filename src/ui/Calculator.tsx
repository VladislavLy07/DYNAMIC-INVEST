import { useState, type FormEvent } from 'react'
import { Calculator as CalculatorIcon, Info } from 'lucide-react'
import { contributionReturn } from '../finance/engine'
import { percent, rub } from './format'

const initial = { principal: 1000000, rate: 16, months: 12, frequency: 12, inflation: 7, tax: 13 }

export function Calculator() {
  const [inputs, setInputs] = useState(initial)
  const result = contributionReturn(inputs.principal, inputs.rate / 100, inputs.months, inputs.frequency, inputs.inflation / 100, inputs.tax / 100)
  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setInputs({
      principal: Number(data.get('principal')), rate: Number(data.get('rate')), months: Number(data.get('months')),
      frequency: Number(data.get('frequency')), inflation: Number(data.get('inflation')), tax: Number(data.get('tax')),
    })
  }
  return <div className="two-column">
    <section className="panel feature-panel">
      <div className="panel-heading"><div><h2>Параметры расчёта</h2><p>Оцените доход по заданной ставке и сроку</p></div><span className="tile blue"><CalculatorIcon size={18}/></span></div>
      <form onSubmit={calculate}>
        <div className="field-grid">
          <label>Начальная сумма, ₽<input name="principal" type="number" min="0.01" max="1000000000000" step="0.01" required defaultValue={initial.principal}/></label>
          <label>Годовая ставка, %<input name="rate" type="number" min="0" max="100" step=".01" required defaultValue={initial.rate}/></label>
          <label>Срок, месяцев<input name="months" type="number" min="1" max="120" required defaultValue={initial.months}/></label>
          <label>Капитализация<select name="frequency" defaultValue={initial.frequency}><option value="0">Простые проценты</option><option value="1">Ежегодная</option><option value="2">Раз в полгода</option><option value="4">Ежеквартальная</option><option value="12">Ежемесячная</option></select></label>
          <label>Инфляция за год, %<input name="inflation" type="number" min="-50" max="100" step=".01" required defaultValue={initial.inflation}/></label>
          <label>Условная ставка налога, %<input name="tax" type="number" min="0" max="100" step=".01" required defaultValue={initial.tax}/></label>
        </div>
        <div className="form-actions"><button className="button primary">Рассчитать</button></div>
      </form>
    </section>
    <section className="panel feature-panel" aria-live="polite">
      <div className="panel-heading"><div><h2>Результат расчёта</h2><p>Через {inputs.months} мес.</p></div></div>
      <div className="large-result">{rub(result.total)}</div>
      <p className="secondary">Итоговый капитал после условного налога</p>
      <dl className="result-list">
        <div><dt>Доход до налога</dt><dd>{rub(result.gross)}</dd></div>
        <div><dt>Условный налог</dt><dd>{rub(result.taxAmount)}</dd></div>
        <div><dt>Чистый доход</dt><dd className="green-text">{rub(result.net)}</dd></div>
        <div><dt>Номинальная доходность после налога</dt><dd>{percent(result.net / inputs.principal)}</dd></div>
        <div><dt>Реальная доходность за срок</dt><dd>{percent(result.real)}</dd></div>
      </dl>
    </section>
    <section className="panel feature-panel full-width methodology">
      <h2><Info size={18}/> Формулы и допущения</h2>
      <p>Простые проценты · <code>A = P × (1 + r × t)</code>. Капитализация · <code>A = P × (1 + r / n)ᵏ × (1 + r × (t − k / n))</code>.</p>
      <p>P — начальный капитал, r — годовая ставка в долях, t — срок в годах, n — число капитализаций в год, k — число полных периодов. Для неполного периода применяются простые проценты.</p>
      <p>Условный налог взимается с положительного дохода в конце срока. Реальная доходность равна отношению чистого итогового капитала к первоначальному, делённому на индекс инфляции за срок, минус единица. Расчёт использует введённые ставки и не учитывает налоговые льготы и комиссии.</p>
    </section>
  </div>
}
