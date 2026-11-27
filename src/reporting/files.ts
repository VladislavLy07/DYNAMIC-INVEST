import { financialEventLabel, type FinancialEvent } from '../finance/ledger.ts'

const quote = (value: string | number) => {
  const safe = typeof value === 'string' && (/^[\s\uFEFF]*[=+@\-＝＋－＠]/u.test(value) || /^[\r\n\t]/.test(value)) ? "'" + value : String(value)
  return '"' + safe.replaceAll('"', '""') + '"'
}

export function csv(rows: (string | number)[][]) {
  return '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')
}

export function eventsCsv(events: FinancialEvent[]) {
  return csv([['Дата', 'Инструмент', 'Событие', 'Валюта', 'Сумма', 'Рубли', 'Статус', 'Источник'],
    ...events.map(e => [e.date, e.name, financialEventLabel(e), e.currency, e.amount, e.rubles, e.status === 'forecast' ? 'Прогноз' : 'Подтверждено', e.source])])
}

const icsText = (s: string) => s.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
function fold(line: string) {
  const encoder = new TextEncoder()
  let bytes = 0, result = ''
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 75) { result += '\r\n '; bytes = 1 }
    result += char
    bytes += size
  }
  return result
}

export function eventsIcs(events: FinancialEvent[], stamp = new Date()) {
  const date = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z')
  const safe = events.filter(e => ['income', 'principal', 'tax'].includes(e.type))
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DYNAMIC INVEST//Capital Calendar//RU', 'CALSCALE:GREGORIAN',
    ...safe.flatMap((e, index) => ['BEGIN:VEVENT', `UID:di-${e.date}-${index}@dynamic-invest`, `DTSTAMP:${date}`,
      `DTSTART;VALUE=DATE:${e.date.replaceAll('-', '')}`, `SUMMARY:${icsText(financialEventLabel(e) + ' · ' + e.name)}`,
      `DESCRIPTION:${icsText(e.amount + ' ' + e.currency + (e.status === 'forecast' ? ' · прогноз' : ' · подтверждено'))}`, 'END:VEVENT']),
    'END:VCALENDAR', ''].map(fold).join('\r\n')
}

export function downloadFile(name: string, content: string, mime: string) {
  const href = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = href
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
