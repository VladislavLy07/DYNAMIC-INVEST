import assert from 'node:assert/strict'
import test from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import { buildWorkbook } from './xlsx.ts'

test('workbook preserves numbers and Cyrillic while writing formula-like data as text', () => {
  const archive = unzipSync(buildWorkbook([{ name: 'Параметры', rows: [['Капитал', 1234.56, '=HYPERLINK("https://invalid.test")', '<name>&', '\u0000вклад']] }]))
  assert.ok(archive['[Content_Types].xml'])
  assert.match(strFromU8(archive['xl/workbook.xml']), /name="Параметры"/)
  const sheet = strFromU8(archive['xl/worksheets/sheet1.xml'])
  assert.match(sheet, /<c r="B1" t="n"><v>1234.56<\/v>/)
  assert.match(sheet, /<c r="C1" t="inlineStr">/)
  assert.match(sheet, /=HYPERLINK/)
  assert.doesNotMatch(sheet, /<f>|\u0000/)
  assert.match(sheet, /&lt;name&gt;&amp;/)
  assert.throws(() => buildWorkbook([{ name: 'Имя/таблица', rows: [] }]), /недопустимы/)
})
