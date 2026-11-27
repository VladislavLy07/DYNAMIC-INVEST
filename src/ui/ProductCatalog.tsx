import { useState } from 'react'
import { ArrowUpRight, Star } from 'lucide-react'
import { productVersions, selectProductVersions, type ProductTerm } from '../market/catalog'
import { rub } from './format'
import type { Currency } from '../finance/model'

const decimal = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 4 })
const rateText = (t: ProductTerm) => t.rateRange ? t.rateRange.map(decimal).join('–') + ' %'
  : t.rateCeiling !== undefined ? 'До ' + decimal(t.rateCeiling) + ' %' : t.rate === null ? 'Ставка не указана' : decimal(t.rate) + ' %'
const termText = (t: ProductTerm) => t.days ? t.days.join('–') + ' дн.' : t.months ? t.months + ' мес.' : '—'
const amount = (n: number, currency: Currency = 'RUB') => currency === 'RUB' ? rub(n) : decimal(n) + ' ' + currency

export const favoritesKey = 'dynamic-invest:favorites:v1'

export function ProductCatalog({ date, archive, favorites, toggle }: { date: string; archive: boolean; favorites: string[]; toggle: (key: string) => void }) {
  const [mode, setMode] = useState<'year' | 'asof'>('year')
  const [query, setQuery] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [compare, setCompare] = useState<string[]>([])
  const [kind, setKind] = useState('')
  const [ascending, setAscending] = useState(false)
  const items = selectProductVersions(productVersions, date, archive ? mode : 'current')
    .filter(p => (!kind || p.kind === kind) && (!favoriteOnly || favorites.includes(p.productId)) &&
      (p.name + ' ' + p.issuer).toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => (ascending ? 1 : -1) * a.observedAt.localeCompare(b.observedAt))
  const comparing = items.filter(item => compare.includes(item.versionId))
  return <section className="panel feature-panel stack">
    <div className="panel-heading"><div><h2>{archive ? 'Архив финансовых продуктов' : 'Последние наблюдения витрины ПСБ'}</h2><p>{archive ? 'Датированные наблюдения из официальных публикаций. Периоды действия обычно неизвестны.' : 'Официальные карточки, наблюдавшиеся не более семи дней назад. Уточняйте условия в банке.'}</p></div>
      {archive ? <div className="segmented"><button aria-pressed={mode === 'year'} onClick={() => setMode('year')}>Наблюдения года</button><button aria-pressed={mode === 'asof'} onClick={() => setMode('asof')}>На дату</button></div> : <a className="button quiet" href="#archive">Открыть архив</a>}</div>
    <div className="filter-row">
      <label>Продукт или эмитент<input type="search" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <label>Категория<select value={kind} onChange={e => setKind(e.target.value)}><option value="">Все</option><option>Вклады</option><option>Накопительные счета</option><option>ЦФА</option></select></label>
      <label>Сортировка<select value={ascending ? 'asc' : 'desc'} onChange={e => setAscending(e.target.value === 'asc')}><option value="desc">Сначала новые</option><option value="asc">Сначала ранние</option></select></label>
      <label className="inline-field"><input type="checkbox" checked={favoriteOnly} onChange={e => setFavoriteOnly(e.target.checked)}/> Избранное</label>
    </div>
    {items.length ? <div className="source-grid">{items.map(item => <article className="source-card" key={item.versionId}><div className="product-card-top"><span className="soft-badge">{item.kind} · {item.observedAt}</span><button className="icon-button" aria-label={`Избранное: ${item.name}`} aria-pressed={favorites.includes(item.productId)} onClick={() => toggle(item.productId)}><Star size={17} fill={favorites.includes(item.productId) ? 'currentColor' : 'none'}/></button></div>
      <h3>{item.name}</h3><p>{item.issuer} · {item.currency ?? 'RUB'} · {item.evidence ? 'Снимок официальной витрины' : 'Датированная публикация'}</p>{item.validFrom && <p>Дата вступления ставки по источнику · {item.validFrom}</p>}<details><summary>Условия ({item.terms.length})</summary><ul className="catalog-terms">{item.terms.map((term, i) => <li key={i}><b>{rateText(term)}{termText(term) !== '—' && ' · ' + termText(term)}</b>{term.min !== null && <p>От {amount(term.min, item.currency)}{term.max === null ? '' : ` до ${amount(term.max, item.currency)}`}</p>}<p>{term.criteria}</p></li>)}</ul></details>
      <div className="toolbar wrap"><a className="text-link" href={item.source} target="_blank" rel="noreferrer">Официальный источник <ArrowUpRight size={13}/></a><button className="button quiet" aria-pressed={compare.includes(item.versionId)} disabled={!compare.includes(item.versionId) && comparing.length >= 5} onClick={() => setCompare(current => current.includes(item.versionId) ? current.filter(id => id !== item.versionId) : [...current, item.versionId])}>Сравнить</button></div>
    </article>)}</div> : <p className="empty">{archive ? 'Для выбранного периода и фильтра нет подтверждённых строк.' : 'Свежего снимка для выбранных условий нет. Последние датированные наблюдения доступны в архиве.'}</p>}
    {comparing.length >= 2 && <div className="table-scroll"><table><thead><tr><th>Продукт</th><th>Дата</th><th>Срок</th><th>Ставка</th><th>Условия</th></tr></thead><tbody>{comparing.flatMap(item => item.terms.map((term, i) => <tr key={item.versionId + i}><td>{item.name}</td><td>{item.observedAt}</td><td>{termText(term)}</td><td>{rateText(term)}</td><td>{term.criteria}</td></tr>))}</tbody></table></div>}
  </section>
}
