export function parseMoex(json, ticker) {
  const { history } = JSON.parse(json)
  if (!history || !Array.isArray(history.columns) || !Array.isArray(history.data) || !history.data.length) throw new Error('Пустая или неизвестная схема ISS')
  const fields = ['TRADEDATE', 'SECID', 'CLOSE'].map(name => history.columns.indexOf(name))
  if (fields.includes(-1)) throw new Error('ISS не вернул необходимые колонки')
  const days = new Map()
  for (const row of history.data) {
    const [date, code, value] = fields.map(i => row[i])
    if (code !== ticker || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date || !Number.isFinite(value) || value <= 0) throw new Error('Некорректное наблюдение ISS')
    if (days.has(date) && days.get(date) !== value) throw new Error('Неоднозначная котировка ISS')
    days.set(date, value)
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
}

export function moexAdapters(today) {
  const from = new Date(Date.parse(today) - 40 * 86400000).toISOString().slice(0, 10)
  return ['IMOEX', 'RGBI'].map(ticker => ({
    id: ticker,
    source: 'https://www.moex.com/',
    url: `https://iss.moex.com/iss/history/engines/stock/markets/index/securities/${ticker}.json?iss.meta=off&from=${from}&till=${today}`,
    parse: data => parseMoex(data, ticker),
  }))
}
