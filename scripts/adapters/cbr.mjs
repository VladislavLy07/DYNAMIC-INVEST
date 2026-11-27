const cbr = 'https://www.cbr.ru/'
const localeDate = key => key.split('-').reverse().join('.')
const number = text => Number(text.replace(/&nbsp;|[\s\u00a0]/g, '').replace(',', '.'))
const datePattern = /^(\d{2})\.(\d{2})\.(\d{4})$/
const toIso = text => text.replace(datePattern, '$3-$2-$1')
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date

function observed(rows, minimum, maximum) {
  const data = new Map()
  for (const { date, value } of rows) {
    if (!validDate(date) || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error('Недопустимая дата или значение в источнике')
    if (data.has(date) && data.get(date) !== value) throw new Error('Противоречивые значения на одну дату')
    data.set(date, value)
  }
  if (!data.size) throw new Error('Данные не найдены, проверьте схему источника')
  return [...data].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
}

function rows(html) {
  const table = html.match(/<table\s+class="data"[^>]*>([\s\S]*?)<\/table>/i)?.[1]
  if (!table) throw new Error('Таблица Банка России отсутствует')
  return Array.from(table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi), match =>
    Array.from(match[1].matchAll(/<td(?:\s+[^>]*)?>([^<]*)<\/td>/gi), cell => cell[1].trim())).filter(row => row.length)
}

export function parseKeyRate(html) {
  if (!html.includes('<th>Ставка</th>')) throw new Error('Заголовки таблицы ключевой ставки изменились')
  return observed(rows(html).map(([date, value]) => ({ date: toIso(date), value: number(value ?? '') })), 0.01, 100)
}

export function parseInflation(html) {
  if (!html.includes('Инфляция, % г/г')) throw new Error('Заголовки таблицы инфляции изменились')
  return observed(rows(html).map(([month, , value]) => {
    const [m, year] = month.split('.')
    if (!/^\d{2}\.\d{4}$/.test(month) || value === undefined || !value) throw new Error('Некорректная запись инфляции')
    const date = new Date(Date.UTC(Number(year), Number(m), 0)).toISOString().slice(0, 10)
    return { date, value: number(value) }
  }), -50, 100)
}

export function parseGold(html) {
  if (!/<th[^>]*>Золото<\/th>/.test(html)) throw new Error('Колонка золота отсутствует')
  return observed(rows(html).map(([date, price]) => ({ date: toIso(date), value: number(price ?? '') })), 1, 1e7)
}

export function parseCurrency(xml, id) {
  if (!xml.includes(`<ValCurs ID="${id}"`)) throw new Error('Валютный ответ не соответствует запрошенному коду')
  const records = [...xml.matchAll(/<Record\s+Date="([^"]+)"\s+Id="([^"]+)">([\s\S]*?)<\/Record>/g)]
  return observed(records.map(([, date, recordId, contents]) => {
    const nominal = number(contents.match(/<Nominal>([^<]+)<\/Nominal>/)?.[1] ?? '')
    const value = number(contents.match(/<Value>([^<]+)<\/Value>/)?.[1] ?? '')
    if (recordId !== id || nominal <= 0) throw new Error('Некорректный номинал или идентификатор валюты')
    return { date: toIso(date), value: value / nominal }
  }), .0001, 1e6)
}

export function cbrAdapters(from, to) {
  const dated = '?UniDbQuery.Posted=True&UniDbQuery.From=' + localeDate(from) + '&UniDbQuery.To=' + localeDate(to)
  const make = (id, source, request, parse) => ({ id, source: cbr + source, url: cbr + request, parse })
  const currencies = { USD: 'R01235', EUR: 'R01239', CNY: 'R01375' }
  return [
    make('key', 'hd_base/KeyRate/', 'hd_base/KeyRate/' + dated, parseKeyRate),
    make('inflation', 'hd_base/infl/', 'hd_base/infl/' + dated, parseInflation),
    make('gold', 'hd_base/metall/metall_base_new/', 'hd_base/metall/metall_base_new/' + dated + '&UniDbQuery.Gold=true', parseGold),
    ...Object.entries(currencies).map(([code, id]) => make(code, 'currency_base/dynamics/', 'scripts/XML_dynamic.asp?' + new URLSearchParams({
      date_req1: localeDate(from).replaceAll('.', '/'), date_req2: localeDate(to).replaceAll('.', '/'), VAL_NM_RQ: id,
    }), text => parseCurrency(text, id))),
  ]
}
