import { useRef, useState, type FormEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { allocation, available, decodeWorkspace, maxBackupBytes, type Portfolio, type Workspace } from '../portfolio/workspace'
import { decodePositions, positionColumns } from '../portfolio/csv'
import type { Asset } from '../finance/model'
import { csv, downloadFile } from '../reporting/files'
import { rub } from './format'

export function PortfolioSettings({ portfolio, save, create }: { portfolio: Portfolio; save: (p: Portfolio) => void; create: () => void }) {
  const [error, setError] = useState('')
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    try {
      save({ ...portfolio, name: String(data.get('name')).trim(), budget: Number(data.get('budget')), contribution: Number(data.get('contribution')), withdrawal: Number(data.get('withdrawal')), reinvest: Number(data.get('reinvest')) })
      setError('')
    } catch (error) { setError(error instanceof Error ? error.message : 'Проверьте параметры.') }
  }
  return <div className="stack">
    <div className="capital-budget">
      <div className="panel feature-panel"><p>Первоначальный капитал</p><strong>{rub(portfolio.budget)}</strong></div>
      <div className="panel feature-panel"><p>Распределено по цене приобретения</p><strong>{rub(allocation(portfolio.assets))}</strong></div>
      <div className="panel feature-panel"><p>Осталось распределить</p><strong>{rub(available(portfolio))}</strong></div>
    </div>
    <section className="panel feature-panel">
      <div className="panel-heading"><div><h2>Параметры портфеля</h2><p>Позиции ограничены выделенным бюджетом</p></div><button className="button quiet" onClick={create}>Новый портфель</button></div>
      <form onSubmit={submit}>
        <div className="field-grid portfolio-fields">
          <label>Название портфеля<input name="name" required maxLength={100} defaultValue={portfolio.name}/></label>
          <label>Бюджет, ₽<input name="budget" type="number" required min={0} max={1e14} step=".01" defaultValue={portfolio.budget}/></label>
          <label>Пополнение в месяц, ₽<input name="contribution" type="number" required min={0} max={1e12} step=".01" defaultValue={portfolio.contribution}/></label>
          <label>Изъятие в месяц, ₽<input name="withdrawal" type="number" required min={0} max={1e12} step=".01" defaultValue={portfolio.withdrawal}/></label>
          <label>Доходность реинвестирования, %<input name="reinvest" type="number" required min={0} max={100} step=".01" defaultValue={portfolio.reinvest}/></label>
        </div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="form-actions"><button className="button primary">Сохранить параметры</button></div>
      </form>
    </section>
  </div>
}

export function BackupTools({ data, restore, append, clear }: { data: Workspace; restore: (data: Workspace) => void; append: (assets: Asset[]) => void; clear: () => void }) {
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Workspace>()
  const [pendingPositions, setPendingPositions] = useState<Asset[]>()
  const csvInput = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  async function read(file: File | undefined, asCsv = false) {
    if (!file) return
    setPending(undefined)
    setPendingPositions(undefined)
    try {
      if (file.size > maxBackupBytes) throw new Error('Файл превышает 1 МБ.')
      const content = await file.text()
      if (asCsv) {
        const assets = decodePositions(content)
        setPendingPositions(assets)
        setMessage(`Проверено позиций: ${assets.length}. Импортируются базовые поля в активный портфель. Полный график и условия восстанавливает JSON.`)
      } else {
        setPending(decodeWorkspace(content))
        setMessage('Копия прошла проверку. Подтвердите замену локальных портфелей.')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Файл не удалось прочитать.') }
  }
  return <section className="panel feature-panel stack">
    <div className="panel-heading"><div><h2>Локальные данные</h2><p>Хранилище этого браузера. Используйте обезличенные данные и сохраняйте резервную копию.</p></div></div>
    <div className="toolbar wrap">
      <button className="button quiet" onClick={() => downloadFile('dynamic-invest-backup.json', JSON.stringify(data, null, 2), 'application/json')}><Download size={16}/>Скачать JSON</button>
      <button className="button quiet" onClick={() => downloadFile('dynamic-invest-portfolios.csv', csv([positionColumns, ...data.portfolios.flatMap(p => p.assets.map(a => [p.name, a.name, a.kind, a.issuer, a.currency, a.amount, a.cost, a.rate, a.maturity]))]), 'text/csv;charset=utf-8')}><Download size={16}/>Скачать CSV</button>
      <input className="visually-hidden" type="file" ref={input} accept=".json,application/json" aria-label="Резервная копия JSON" onChange={e => { void read(e.target.files?.[0]); e.target.value = '' }}/>
      <button className="button quiet" onClick={() => input.current?.click()}><Upload size={16}/>Импорт JSON</button>
      <input className="visually-hidden" type="file" ref={csvInput} accept=".csv,text/csv" aria-label="Позиции CSV" onChange={e => { void read(e.target.files?.[0], true); e.target.value = '' }}/>
      <button className="button quiet" onClick={() => csvInput.current?.click()}><Upload size={16}/>Импорт CSV</button>
      <button className="button remove" onClick={() => setConfirmClear(true)}>Удалить локальные данные</button>
    </div>
    {message && <p role="status" className="secondary">{message}</p>}
    {pending && <div className="toolbar"><button className="button primary" onClick={() => { restore(pending); setPending(undefined); setMessage('Портфели восстановлены.') }}>Восстановить</button><button className="button quiet" onClick={() => { setPending(undefined); setMessage('') }}>Отмена</button></div>}
    {pendingPositions && <div className="toolbar"><button className="button primary" onClick={() => {
      try { append(pendingPositions); setPendingPositions(undefined); setMessage('Позиции добавлены.') }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Импорт не выполнен.') }
    }}>Добавить позиции</button><button className="button quiet" onClick={() => { setPendingPositions(undefined); setMessage('') }}>Отмена</button></div>}
    {confirmClear && <div><p>Будут удалены локальные портфели и настройки DYNAMIC INVEST.</p><div className="toolbar"><button className="button remove" onClick={() => { clear(); setConfirmClear(false); setMessage('Локальные данные удалены.') }}>Подтвердить удаление</button><button className="button quiet" onClick={() => setConfirmClear(false)}>Отмена</button></div></div>}
  </section>
}
