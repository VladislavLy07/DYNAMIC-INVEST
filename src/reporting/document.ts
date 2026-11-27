import type { ProjectedLedger } from './reportData.ts'
import { reportSheets } from './reportData.ts'
import type { FxRates } from '../finance/model.ts'
import type { Portfolio } from '../portfolio/workspace.ts'
import { downloadFile } from './files.ts'

function binary(data: Uint8Array) {
  let result = ''
  for (let i = 0; i < data.length; i += 8192) result += String.fromCharCode(...data.subarray(i, i + 8192))
  return result
}

export async function downloadPortfolioPdf(portfolio: Portfolio, date: string, projection: ProjectedLedger, fx: FxRates) {
  const [library, fontResponse] = await Promise.all([
    import('jspdf'), fetch(import.meta.env.BASE_URL + 'fonts/report-sans.ttf', { signal: AbortSignal.timeout(12000) }),
  ])
  if (!fontResponse.ok) throw new Error('Не удалось загрузить кириллический шрифт отчёта.')
  const font = new Uint8Array(await fontResponse.arrayBuffer())
  if (font.length > 250_000 || font.length < 1000) throw new Error('Шрифт отчёта повреждён.')
  const document = new library.jsPDF({ unit: 'mm', format: 'a4', compress: true })
  document.addFileToVFS('report-sans.ttf', btoa(binary(font)))
  document.addFont('report-sans.ttf', 'report-sans', 'normal')
  document.setFont('report-sans')
  document.setProperties({ title: 'DYNAMIC INVEST — Отчёт о капитале', subject: 'Прогнозная модель портфеля', creator: 'DYNAMIC INVEST' })
  const sheets = reportSheets(portfolio, date, projection, fx)
  const reportFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
  const printable = (value: string | number) => (typeof value === 'number' ? reportFormat.format(value) : value)
    .replace(/[^\u0020-\u007e\u00a0-\u00ff\u0400-\u052f\u2000-\u206f\u20a0-\u20bf\u2190-\u2199\u2212\u25a1]/gu, '□')
    .replace(/[\u00a0\u202f]/g, ' ')
  let y = 30
  function heading(title: string) {
    document.setFillColor(8, 43, 98)
    document.rect(0, 0, 210, 24, 'F')
    document.setTextColor(255, 255, 255)
    document.setFontSize(13)
    document.text(title, 12, 14)
    document.setTextColor(16, 36, 61)
    document.setFontSize(9)
    y = 33
  }
  function row(cells: readonly (string | number)[], widths: number[], title: string, header = false) {
    const fields = cells.map((value, i) => document.splitTextToSize(printable(value), widths[i] - 4) as string[])
    const height = Math.max(...fields.map(cell => cell.length), 1) * 4.1 + 3
    if (y + height > 280) {
      document.addPage()
      heading(title + ' · продолжение')
    }
    if (header) {
      document.setFillColor(231, 240, 252)
      document.rect(12, y - 4, widths.reduce((total, w) => total + w, 0), height, 'F')
    }
    let x = 14
    fields.forEach((lines, index) => {
      document.text(lines, x, y, { lineHeightFactor: 1.2 })
      x += widths[index]
    })
    y += height
    document.setDrawColor(223, 232, 242)
    document.line(12, y - 4, 198, y - 4)
  }
  heading('DYNAMIC INVEST · Отчёт о капитале')
  sheets[0].rows.forEach((cells, i) => row(cells, [56, 130], 'Параметры отчёта', i === 0))
  document.addPage()
  heading('DYNAMIC INVEST · Траектория капитала')
  const values = projection.points.map(point => point.value)
  const min = Math.min(...values)
  const range = Math.max(1, Math.max(...values) - min)
  const step = 180 / Math.max(1, values.length - 1)
  const chartY = (value: number) => 78 - (value - min) / range * 39
  document.setDrawColor(223, 232, 242)
  document.line(12, 78, 198, 78)
  document.setDrawColor(0, 85, 184)
  document.setLineWidth(.55)
  values.forEach((value, i) => { if (i > 0) document.line(14 + (i - 1) * step, chartY(values[i - 1]), 14 + i * step, chartY(value)) })
  document.setLineWidth(.2)
  y = 91
  sheets[1].rows.forEach((cells, i) => row(cells, [32, 42, 40, 36, 36], 'Траектория капитала', i === 0))
  document.addPage()
  heading('DYNAMIC INVEST · Риски и структура')
  sheets[3].rows.forEach((cells, i) => row(cells, [39, 79, 37, 31], 'Риски и структура', i === 0))
  for (let page = 1; page <= document.getNumberOfPages(); page++) {
    document.setPage(page)
    document.setFontSize(8)
    document.setTextColor(83, 110, 143)
    document.text(`Модельный расчёт · ${page} / ${document.getNumberOfPages()}`, 12, 288)
  }
  downloadFile('dynamic-invest-report.pdf', document.output('blob'), 'application/pdf')
}
