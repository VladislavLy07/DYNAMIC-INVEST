import { addMonths, daysBetween } from '../finance/engine'
import { bankProjection, bankScenarios, type BankParameters } from '../finance/bankSlides'
import { slideHorizons } from '../finance/miniSlides'
import { latestBankObservations, productVersions, type ProductTerm, type ProductVersion } from '../market/catalog'
import { taxSource } from '../tax/deposits'
import { Detail, Disclosure, Link, displayDate, duration, pct, rub } from './InvestmentSlides'

const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 })
const rateText = (term: ProductTerm) => term.rateRange ? term.rateRange.map(value => decimal.format(value)).join('–') + ' %'
  : term.rateCeiling !== undefined ? 'До ' + decimal.format(term.rateCeiling) + ' %'
    : term.rate === null ? 'Ставка не указана' : pct(term.rate / 100)
const termText = (term: ProductTerm) => term.termDays ? term.termDays.join(' / ') + ' дн.'
  : term.fixedDays ? term.fixedDays + ' дн.' : term.days ? term.days.join('–') + ' дн.'
    : term.months ? term.months + ' мес.' : 'Срок не указан'
const amountText = (amount: number, row: ProductVersion) => row.currency === 'CNY' ? decimal.format(amount) + ' ¥' : rub(amount)

const descriptions: Record<string, string> = {
  'psb-income': 'Проценты по срочному вкладу',
  'psb-strong': 'Ставка для новых денег',
  'psb-invest-income': 'Вклад с покупкой паёв',
  'psb-victory': 'Вклад с благотворительной акцией',
  'psb-stable': 'Выплата процентов ежемесячно',
  'psb-moneybox': 'Вклад с пополнением',
  'psb-opportunities': 'Пополнение и частичное снятие',
  'psb-social': 'Для получателей соцподдержки',
  'psb-future': 'Для участников ПДС',
  'psb-metal': 'Вклад при покупке металла',
  'psb-impulse': 'Приветственная ставка',
  'psb-accent': 'Ставка зависит от покупок',
  'psb-vector': 'Два способа учёта остатка',
}

function bankStatus(item: ProductVersion, historical: boolean) {
  if (item.storefront === 'archived') return 'Архивный продукт'
  if (historical) return 'Историческое наблюдение'
  if (item.evidence === 'official-product-snapshot') return 'Датированный снимок'
  if (item.evidence === 'official-index') return 'Индекс витрины ПСБ'
  return 'Публикация от ' + displayDate(item.observedAt)
}

function BankResult({ outcome, name }: { outcome: ReturnType<typeof bankProjection>; name: string }) {
  return <section className="mini-outcome" aria-label={name}>
    <h5>{name}</h5>
    {outcome ? <dl className="mini-result-lines">
      <div><dt>Доход до налога</dt><dd>{rub(outcome.gross)}</dd></div>
      <div><dt>НДФЛ</dt><dd>{outcome.tax === null ? '—' : rub(outcome.tax)}</dd></div>
      <div><dt>Доход после налога</dt><dd>{outcome.net === null ? '—' : rub(outcome.net)}</dd></div>
      <div><dt>Чистая доходность за срок</dt><dd>{outcome.netReturn === null ? '—' : pct(outcome.netReturn)}</dd></div>
    </dl> : <p className="mini-muted">Для выбранной суммы и срока нет применимой точной ставки.</p>}
  </section>
}

function BankCard({ item, input, historical }: { item: ProductVersion; input: BankParameters; historical: boolean }) {
  const { result, base, qualified, frequency } = bankScenarios(item, input)
  const savings = item.kind === 'Накопительные счета'
  const band = item.terms.find(term => term.rateRange)
  const days = daysBetween(input.date, addMonths(input.date, input.months))
  const bandFits = band?.days ? days >= band.days[0] && days <= band.days[1]
    : band?.termDays ? band.termDays.includes(days) : Boolean(band)
  const range = !result && bandFits && band?.rateRange && item.currency !== 'CNY' &&
    (band.min === null || input.amount >= band.min) && (band.max === null || input.amount <= band.max)
    ? band.rateRange.map(rate => bankProjection(input, rate, frequency)) : null
  const status = bankStatus(item, historical)
  const label = item.terms[0]?.criteria
  const hasSpecial = item.terms.some(term => term.qualified || term.promotion)
  const boundary = range && range.every(value => value?.net != null) ? range : null
  return <Disclosure title={item.name} brief={`${descriptions[item.productId] ?? (savings ? 'Проценты на остаток' : item.currency === 'CNY' ? 'Вклад в юанях' : 'Срочный вклад')} · ${status}`} heading={<span className="mini-bank">
    <span><span>{boundary ? 'Чистая доходность · сценарии' : 'Чистая доходность'}</span><strong data-bank-yield>{result?.netReturn != null ? pct(result.netReturn) : boundary?.map(value => pct(value!.netReturn!)).join(' – ') ?? '—'}</strong></span>
    <span><span>Чистая прибыль</span><strong data-bank-profit>{result?.net != null ? rub(result.net) : boundary?.map(value => rub(value!.net!)).join(' – ') ?? '—'}</strong></span>
  </span>}>
    <section>
      <h4>Расчёт за выбранный срок</h4>
      <div className="bank-results">
        <BankResult outcome={base} name={hasSpecial ? 'Без дополнительных условий' : 'Расчёт по наблюдению'}/>
        {hasSpecial && <BankResult outcome={qualified} name="При выполнении условий"/>}
      </div>
      <p className="mini-muted mini-caption">{item.currency === 'CNY' ? 'Для расчёта нужны сумма в валюте, курсы на даты выплаты и точная ставка договора.'
        : `Модель ACT/365. ${frequency === 'maturity' ? 'Проценты выплачиваются при окончании срока.' : frequency === 'capitalized' ? 'Проценты капитализируются в конце календарного месяца. Остаток последнего периода выплачивается при модельном закрытии.' : 'Месячные выплаты без капитализации.'} Движений по счёту и переноса лимита долгосрочных вкладов в модели нет.`}</p>
    </section>
    <section><h4>Условия продукта</h4>
      <ul className="bank-terms">{item.terms.map((term, index) => <li key={index}>
        <strong>{rateText(term)} · {termText(term)}</strong>
        <span>{term.min !== null ? 'От ' + amountText(term.min, item) : 'Минимум не указан'}{term.max !== null ? ' · до ' + amountText(term.max, item) : ''}</span>
        <span>{term.qualified || term.promotion ? 'Повышенные или специальные условия. ' : ''}{term.criteria}</span>
      </li>)}</ul>
    </section>
    <div className="mini-extras">
      {boundary && band?.rateRange && <Detail title="Чувствительность к ставке">
        <p>Условный результат при крайних ставках из опубликованного диапазона. Ставка для выбранного срока неизвестна.</p>
        <dl className="mini-result-lines">{boundary.map((value, i) => <div key={i}><dt>{pct(band.rateRange![i] / 100)} годовых</dt><dd>{rub(value!.net!)}</dd></div>)}</dl>
      </Detail>}
      <Detail title="Другие горизонты"><dl className="mini-result-lines">{slideHorizons.filter(months => months !== input.months).map(months => {
        const other = bankScenarios(item, { ...input, months }).result
        return <div key={months}><dt>{duration[months]}</dt><dd>{other?.net == null ? 'Нет расчёта' : `${pct(other.netReturn!)} · ${rub(other.net)}`}</dd></div>
      })}</dl></Detail>
      {result && <Detail title="Налог по годам"><dl className="mini-result-lines">{result.years.map(year => <div key={year.year}>
        <dt>{year.year} · проценты {rub(year.gross)} · доступный лимит {rub(year.allowance)}</dt><dd>{year.tax === null ? '—' : rub(year.tax)}</dd>
      </div>)}</dl><Link href={taxSource}>Разъяснения ФНС</Link></Detail>}
      <Detail title={savings ? 'Снятие средств' : 'Досрочное расторжение'}>
        <p>{savings ? 'Снятие может изменить остаток для расчёта процентов. Применимые условия указаны в тарифе.' : 'Ставку и порядок пересчёта при досрочном закрытии определяет договор. Условия продукта уточняйте в банке.'}</p>
      </Detail>
      <Detail title="Источник и дата"><p>{status} от {displayDate(item.observedAt)}.{item.validFrom && ` Редакция с ${displayDate(item.validFrom)}.`} {label}</p><Link href={item.source}>Официальный источник ПСБ</Link></Detail>
    </div>
  </Disclosure>
}

export function ProductCatalog({ input, historical }: { input: BankParameters; historical: boolean }) {
  const sourceRows = historical ? productVersions.filter(item => item.observedAt.slice(0, 4) === input.date.slice(0, 4)) : productVersions
  const rows = latestBankObservations(sourceRows, input.date)
  return <>
    {(['Вклады', 'Накопительные счета'] as const).map((kind, index) => {
      const items = rows.filter(row => row.kind === kind)
      const id = index ? 'savings-accounts' : 'deposits'
      return <section key={kind} className="product-group" aria-labelledby={id}>
        <h2 id={id}>{index ? kind : 'Банковские вклады'}</h2>
        <p className="group-note">{index ? 'Ставки по счетам могут меняться.' : 'Условия и доступность открытия проверяйте в ПСБ.'}</p>
        {items.length ? items.map(item => <BankCard key={item.productId} item={item} input={input} historical={historical}/>)
          : <p className="group-note">Для выбранного года и даты нет наблюдений.</p>}
      </section>
    })}
  </>
}
