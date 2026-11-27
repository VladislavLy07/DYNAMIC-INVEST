import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCurrency, parseKeyRate } from './cbr.mjs'
import { parseMoex } from './moex.mjs'
import { refresh } from './collect.mjs'
const html = '<table class="data"><tr><th>Ставка</th></tr><tr><td>01.02.2024</td><td>16,00</td></tr></table>'

test('CBR adapters validate schema, dates and currency nominal', () => {
  assert.deepEqual(parseKeyRate(html), [{ date: '2024-02-01', value: 16 }])
  assert.throws(() => parseKeyRate('<html>CAPTCHA</html>'), /Заголовки/)
  const xml = '<ValCurs ID="X"><Record Date="01.02.2024" Id="X"><Nominal>10</Nominal><Value>125,32</Value></Record></ValCurs>'
  assert.deepEqual(parseCurrency(xml, 'X'), [{ date: '2024-02-01', value: 12.532 }])
  assert.throws(() => parseCurrency(xml.replace('01.02', '31.02'), 'X'), /Недопустимая/)
})
test('MOEX rejects malformed rows and conflicting dates', () => {
  const payload = data => JSON.stringify({ history: { columns: ['SECID', 'TRADEDATE', 'CLOSE'], data } })
  assert.deepEqual(parseMoex(payload([['RGBI', '2024-01-01', 143]]), 'RGBI'), [{ date: '2024-01-01', value: 143 }])
  assert.throws(() => parseMoex(payload([['RGBI', '2024-01-01', 143], ['RGBI', '2024-01-01', 144]]), 'RGBI'), /Неоднозначная/)
})
test('collection retains the last verified series through outage, schema and revision errors', async () => {
  const adapter = { source: 'https://www.cbr.ru/', url: 'https://www.cbr.ru/', parse: parseKeyRate }
  const previous = await refresh(adapter, undefined, '2024-02-01T08:00:00.000Z', async () => html)
  const unavailable = await refresh(adapter, previous, '2024-02-02T08:00:00.000Z', async () => { throw new Error('HTTP 503') })
  assert.equal(unavailable.status, 'unavailable')
  assert.deepEqual(unavailable.series, previous.series)
  const review = await refresh(adapter, unavailable, '2024-02-03T08:00:00.000Z', async () => html.replace('16,00', '16,01'))
  assert.equal(review.status, 'review')
  assert.equal(review.errors.length, 2)
  assert.equal(review.lastSuccess, previous.lastSuccess)
  const future = await refresh(adapter, review, '2024-02-03T08:00:00.000Z', async () => html.replace('01.02', '04.02'))
  assert.equal(future.status, 'unavailable')
  assert.deepEqual(future.series, previous.series)
})
