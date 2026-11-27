import { useEffect, useState } from 'react'
import { fetchArchives } from '../market/archives'

const statuses = { 'archive-observation': 'Архивное наблюдение', 'no-snapshot': 'Снимок к указанной дате не найден', unavailable: 'Индекс недоступен' }

export function ArchiveCoverage({ date }: { date: string }) {
  const [archive, setArchive] = useState<Awaited<ReturnType<typeof fetchArchives>>>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    fetchArchives().then(value => { if (active) setArchive(value) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])
  const year = Number(date.slice(0, 4))
  return <section className="panel feature-panel"><div className="panel-heading"><div><h2>Покрытие внешних архивов</h2><p>{archive ? 'Проверено ' + archive.checkedAt.slice(0, 16).replace('T', ' ') + ' UTC' : 'Метаданные наблюдений'}</p></div></div>
    {failed ? <p className="notice" role="status">Архивные метаданные не загрузились.</p> : archive ?
      <div className="table-scroll quality-table"><table><thead><tr><th>Архив</th><th>Страница</th><th>Результат</th><th>Дата снимка</th></tr></thead><tbody>{archive.rows.filter(row => row.year === year).map((row, i) => {
        const future = row.archivedAt !== undefined && row.archivedAt > date
        return <tr key={i}><td>{row.source}</td><td><a className="text-link" href={row.original} rel="noreferrer" target="_blank">{new URL(row.original).pathname}</a></td>
          <td>{future ? 'Позднее выбранной даты' : statuses[row.status]}{row.error && ' · ' + row.error}</td><td>{row.archiveUrl && !future ? <a className="text-link" href={row.archiveUrl} rel="noreferrer" target="_blank">{row.archivedAt}</a> : '—'}</td></tr>
      })}</tbody></table></div>
      : <p className="secondary" role="status">Загрузка метаданных…</p>}
    <p className="secondary">Возраст снимка и доступность оригинала различаются. Метаданные архива не подтверждают ставки и тарифы.</p>
  </section>
}
