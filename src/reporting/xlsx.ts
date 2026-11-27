import { strToU8, zipSync } from 'fflate'

export interface Worksheet { name: string; rows: readonly (readonly (string | number)[])[] }

function xml(value: string) {
  const cleaned = Array.from(value).filter(char => {
    const code = char.codePointAt(0)!
    return code === 9 || code === 10 || code === 13 || code >= 32 && code !== 0xfffe && code !== 0xffff && (code < 0xd800 || code > 0xdfff)
  }).join('')
  return cleaned.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function columnName(index: number) {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + (value - 1) % 26) + result
  return result
}

const sheetNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const pkgNs = 'http://schemas.openxmlformats.org/package/2006/relationships'

export function buildWorkbook(sheets: Worksheet[]) {
  if (sheets.length < 1 || sheets.length > 10 || sheets.some(s => !s.name || s.name.length > 31 || /[:\\/?*[\]]/.test(s.name) || s.name.startsWith("'") || s.name.endsWith("'") ||
    s.rows.length > 100_000 || s.rows.some(row => row.length > 100)) || new Set(sheets.map(s => s.name.toLowerCase())).size !== sheets.length) throw new Error('Размер книги или имена листов недопустимы.')
  const files: Record<string, string> = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<Relationships xmlns="${pkgNs}"><Relationship Id="rId1" Type="${relNs}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${sheetNs}" xmlns:r="${relNs}"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${pkgNs}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${relNs}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
  }
  sheets.forEach((sheet, i) => {
    const rows = sheet.rows.map((row, index) => {
      const cells = row.map((value, column) => {
        const ref = columnName(column) + (index + 1)
        return typeof value === 'number' && Number.isFinite(value) ? `<c r="${ref}" t="n"><v>${value}</v></c>` :
          `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(String(value).slice(0, 32767))}</t></is></c>`
      }).join('')
      return `<row r="${index + 1}">${cells}</row>`
    }).join('')
    files[`xl/worksheets/sheet${i + 1}.xml`] = `<worksheet xmlns="${sheetNs}"><sheetData>${rows}</sheetData></worksheet>`
  })
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, strToU8('<?xml version="1.0" encoding="UTF-8"?>' + value)])), { level: 6 })
}
