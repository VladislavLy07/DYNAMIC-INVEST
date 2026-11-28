import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { strFromU8, unzipSync } from 'fflate'

async function nav(page: Page, label: string) {
  await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click()
}

test('shows official snapshots with dates and expands separately dated product observations', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'))
  await page.goto('./')
  await nav(page, 'Финансовые продукты')
  await page.getByRole('button', { name: 'Вклады и счета ПСБ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Последние наблюдения витрины ПСБ' })).toBeVisible()
  const vector = page.locator('.source-card').filter({ has: page.getByRole('heading', { name: 'Вектор', exact: true }) })
  await vector.getByText('Условия (2)').click()
  await expect(vector).toContainText('13,5 %')
  await expect(vector).toContainText('12,5 %')
  await expect(vector).toContainText('2026-11-10')
  await nav(page, 'Архив')
  await page.getByRole('combobox', { name: 'Год', exact: true }).selectOption('2024')
  await expect(page.getByRole('heading', { name: 'Народный вклад плюс', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'На дату', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Народный вклад плюс', exact: true })).toHaveCount(0)
})

test('dated bank conditions remain available after the freshness window and support inline year selection', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-03T12:00:00Z'))
  await page.goto('./#products')
  await page.getByRole('button', { name: 'Вклады и счета ПСБ' }).click()
  const vector = page.locator('.source-card').filter({ has: page.getByRole('heading', { name: 'Вектор', exact: true }) })
  await expect(vector).toContainText('старше 7 дней')
  await expect(page.getByRole('heading', { name: 'Импульс', exact: true })).toBeVisible()
  await page.getByLabel('Год наблюдений').selectOption('2023')
  await expect(page.getByRole('heading', { name: 'Мои возможности', exact: true })).toBeVisible()
  await expect(vector).toHaveCount(0)
  await page.getByLabel('Год наблюдений').selectOption('2024')
  await expect(page.getByRole('heading', { name: 'Народный вклад плюс', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/#products$/)
})

test('replays a portfolio with dated transactions and exports reconciled historical valuations', async ({ page }) => {
  await page.goto('./#archive')
  await expect(page.getByRole('heading', { name: 'Историческая симуляция портфеля' })).toBeVisible()
  await page.getByRole('button', { name: 'Рассчитать портфель' }).click()
  await expect(page.getByRole('img', { name: 'Историческая траектория капитала' })).toBeVisible()
  await page.getByLabel('Файл исторического журнала').setInputFiles({ name: 'portfolio.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    version: 1, capital: 100000, holdings: [], quotes: {},
    events: [{ date: '2025-03-01', type: 'contribution', amount: 20000 }, { date: '2025-11-01', type: 'income', amount: 1000 }],
  })) })
  await expect(page.getByText(/операций 2/)).toBeVisible()
  await page.getByRole('button', { name: 'Рассчитать портфель' }).click()
  await expect(page.getByText(/121\s000/)).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать дневные оценки' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toBe('dynamic-invest-replay.csv')
  expect(await readFile((await file.path())!, 'utf8')).toContain('"2025-12-31","121000"')
})

test('calculates securities tax, persists annual assumptions and shows RUB/CNY sensitivity', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'))
  await page.goto('./')
  await nav(page, 'Налоги')
  await page.getByRole('button', { name: 'Ценные бумаги', exact: true }).click()
  await page.getByLabel('Доход операции').fill('3000000')
  await page.getByLabel('Стоимость приобретения').fill('500000')
  await expect(page.locator('.large-result')).toContainText(/327\s000/)
  await page.getByRole('button', { name: 'Дивиденды', exact: true }).click()
  await page.getByLabel('Облагаемая сумма дивидендов, ₽').fill('1000000')
  await expect(page.locator('.large-result')).toContainText(/130\s000/)
  await nav(page, 'Стратегии')
  await page.getByText(/Параметры по календарным годам/).click()
  await page.getByRole('button', { name: 'Добавить параметры года' }).click()
  await page.getByLabel('Инфляция, % · 2026', { exact: true }).fill('22')
  await page.reload()
  await page.getByText(/Параметры по календарным годам/).click()
  await expect(page.getByLabel('Инфляция, % · 2026', { exact: true })).toHaveValue('22')
  await nav(page, 'Аналитический центр')
  await page.getByRole('button', { name: 'RUB / CNY', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Чувствительность к курсу' })).toBeVisible()
  await expect(page.getByText(/Официальный курс Банка России от 2026-11-27/)).toBeVisible()
  await page.getByRole('button', { name: 'Академия', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Поиск по академии' }).fill('XIRR')
  await expect(page.getByRole('heading', { name: 'TWR и XIRR' })).toBeVisible()
})

test('downloads PDF and XLSX from the rendered projection', async ({ page }) => {
  await page.goto('./#analytics')
  await page.getByRole('button', { name: 'Отчёт', exact: true }).click()
  const pdfPending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать PDF', exact: true }).click()
  const pdf = await pdfPending
  expect(pdf.suggestedFilename()).toBe('dynamic-invest-report.pdf')
  const bytes = await readFile((await pdf.path())!)
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF')
  expect(bytes.toString('latin1')).toContain('/ToUnicode')
  expect(bytes.length).toBeGreaterThan(10000)
  const sheetPending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать XLSX', exact: true }).click()
  const sheet = await sheetPending
  expect(sheet.suggestedFilename()).toBe('dynamic-invest-report.xlsx')
  const zip = unzipSync(await readFile((await sheet.path())!))
  expect(strFromU8(zip['xl/workbook.xml'])).toContain('События')
  expect(strFromU8(zip['xl/worksheets/sheet1.xml'])).toContain('10000000')
})

test('keeps the new catalogue and analytics within phone and tablet widths', async ({ page }) => {
  const tools = [
    ['products', '', 'Финансовые продукты'],
    ['archive', '', 'Историческая симуляция портфеля'],
    ['tax', 'Ценные бумаги', 'НДФЛ по биржевым ценным бумагам'],
    ['analytics', 'RUB / CNY', 'Russia–China Investment Lab'],
    ['analytics', 'Отчёт', 'Динамика капитала'],
  ]
  for (const width of [320, 360, 768]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [hash, button, heading] of tools) {
      await test.step(`${width}px · ${heading}`, async () => {
        await page.goto('./?viewport=' + width + '#' + hash)
        if (button) await page.getByRole('button', { name: button, exact: true }).click()
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
      })
    }
  }
})
