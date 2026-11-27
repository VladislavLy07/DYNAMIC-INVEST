import { maxAssets } from './workspace.ts'
import { validAsset, type Asset } from '../finance/model.ts'

export const positionColumns = ['Портфель', 'Инструмент', 'Тип', 'Эмитент', 'Валюта', 'Текущая оценка', 'Стоимость приобретения', 'Ставка', 'Погашение']

function readRows(raw: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let closed = false
  const text = raw.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (char === '"') { quoted = false; closed = true }
      else cell += char
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(cell)
      cell = ''
      closed = false
      if (char !== ',') {
        if (row.some(Boolean)) rows.push(row)
        row = []
        if (char === '\r' && text[i + 1] === '\n') i++
      }
    } else if (char === '"' && cell === '' && !closed) quoted = true
    else if (char === '"' || closed) throw new Error('Некорректные кавычки CSV.')
    else cell += char
  }
  if (quoted) throw new Error('Незакрытая строка CSV.')
  row.push(cell)
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function decodePositions(raw: string, makeId: () => string = () => crypto.randomUUID()): Asset[] {
  const [header, ...rows] = readRows(raw)
  if (!header || header.length !== positionColumns.length || positionColumns.some((value, index) => header[index] !== value)) throw new Error('Импортируйте CSV с этими же колонками из DYNAMIC INVEST.')
  if (!rows.length || rows.length > maxAssets) throw new Error(`Файл должен содержать от 1 до ${maxAssets} позиций.`)
  const unescape = (value: string) => value.replace(/^'(?=[\r\n\t]|\s*[=+@\-＝＋－＠])/u, '')
  return rows.map((fields, index) => {
    if (fields.length !== header.length) throw new Error(`Строка ${index + 2} имеет неверное число полей.`)
    const [, name, kind, issuer, currency, amount, cost, rate, maturity] = fields
    const position: unknown = { id: makeId(), name: unescape(name), kind, issuer: unescape(issuer), currency, amount: Number(amount),
      cost: Number(cost), rate: rate.trim() ? Number(rate) : NaN, maturity, frequency: 12, liquidity: 'Средний', risk: 'Средний' }
    if (!validAsset(position) || position.name.length > 100 || position.issuer.length > 100) throw new Error(`Некорректная позиция в строке ${index + 2}.`)
    return position
  })
}
