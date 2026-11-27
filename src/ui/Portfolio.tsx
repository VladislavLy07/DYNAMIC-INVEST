import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { currencies, kinds, levels, validAsset, type Asset, type FxRates } from '../finance/model'
import { percent, rub } from './format'

export function AssetEditor({ asset, today, close, save }: { asset?: Asset; today: string; close: () => void; save: (asset: Asset) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const edited: unknown = {
      id: asset?.id ?? crypto.randomUUID(), name: String(data.get('name')).trim(), issuer: String(data.get('issuer')).trim(),
      kind: data.get('kind'), currency: data.get('currency'), amount: Number(data.get('amount')), cost: Number(data.get('cost')),
      rate: Number(data.get('rate')), frequency: Number(data.get('frequency')), maturity: data.get('maturity'), scheduleStart: data.get('scheduleStart'),
      liquidity: data.get('liquidity'), risk: data.get('risk'),
    }
    if (!validAsset(edited)) { setError('Проверьте значения. Дата погашения должна быть позже даты начала выплат по графику.'); return }
    save(edited)
  }
  return <dialog ref={dialog} className="panel dialog" onCancel={event => { event.preventDefault(); close() }} aria-labelledby="editor-title">
    <div className="panel-heading"><h2 id="editor-title">{asset ? 'Изменить актив' : 'Добавить актив'}</h2><button className="icon-button" aria-label="Закрыть" onClick={close}><X size={20}/></button></div>
    <form onSubmit={submit}>
      <div className="field-grid">
        <label>Название<input name="name" required maxLength={100} defaultValue={asset?.name} autoFocus /></label>
        <label>Эмитент<input name="issuer" required maxLength={100} defaultValue={asset?.issuer} /></label>
        <label>Класс актива<select name="kind" defaultValue={asset?.kind}>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>
        <label>Валюта<select name="currency" defaultValue={asset?.currency}>{currencies.map(currency => <option key={currency}>{currency}</option>)}</select></label>
        <label>Текущая сумма<input name="amount" type="number" min="0.01" max="1000000000000" step="0.01" required defaultValue={asset?.amount}/></label>
        <label>Стоимость приобретения<input name="cost" type="number" min="0.01" max="1000000000000" step="0.01" required defaultValue={asset?.cost}/></label>
        <label>Годовая ставка, %<input name="rate" type="number" min="0" max="100" step="0.01" required defaultValue={asset?.rate ?? 0}/></label>
        <label>Начало расчётного периода<input name="scheduleStart" type="date" max={today} required defaultValue={asset?.scheduleStart ?? today}/></label>
        <label>Дата погашения<input name="maturity" type="date" max="9999-12-31" defaultValue={asset?.maturity}/></label>
        <label>Выплат в год<select name="frequency" defaultValue={asset?.frequency ?? 12}>{[1, 2, 4, 12].map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Ликвидность<select name="liquidity" defaultValue={asset?.liquidity ?? 'Средний'}>{levels.map(level => <option key={level}>{level}</option>)}</select></label>
        <label>Риск<select name="risk" defaultValue={asset?.risk ?? 'Средний'}>{levels.map(level => <option key={level}>{level}</option>)}</select></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button quiet" onClick={close}>Отмена</button><button className="button primary" type="submit">Сохранить</button></div>
    </form>
  </dialog>
}

export function Portfolio({ assets, fx, edit, remove }: { assets: Asset[]; fx: FxRates; edit: (asset: Asset) => void; remove: (asset: Asset) => void }) {
  const [filter, setFilter] = useState('')
  const visible = assets.filter(asset => `${asset.name} ${asset.kind} ${asset.issuer}`.toLocaleLowerCase('ru').includes(filter.trim().toLocaleLowerCase('ru')))
  return <section className="panel payouts">
    <div className="panel-heading"><div><h2>Позиции портфеля</h2><p>Учёт стоимости, сроков и условий выплат</p></div><input className="search-input" type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Поиск актива" aria-label="Поиск актива" /></div>
    {visible.length ? <div className="table-scroll"><table>
      <thead><tr><th>Инструмент</th><th>Эмитент</th><th className="numeric">Стоимость, ₽</th><th>Ставка</th><th>Погашение</th><th>Действия</th></tr></thead>
      <tbody>{visible.map(a => <tr key={a.id}>
        <td><b>{a.name}</b><div className="secondary">{a.kind} · {a.currency}</div></td><td>{a.issuer}</td>
        <td className="numeric">{rub(a.amount * fx[a.currency])}</td><td>{percent(a.rate / 100)}</td><td>{a.maturity || '—'}</td>
        <td><div className="table-actions"><button className="icon-button" aria-label={`Изменить ${a.name}`} onClick={() => edit(a)}><Pencil size={16}/></button><button className="icon-button danger" aria-label={`Удалить ${a.name}`} onClick={() => remove(a)}><Trash2 size={16}/></button></div></td>
      </tr>)}</tbody>
    </table></div> : <p className="empty">{assets.length ? 'По этому запросу ничего не найдено.' : 'Добавьте первый актив в портфель.'}</p>}
  </section>
}
