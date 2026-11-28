import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const groups = ['Банковские вклады', 'Накопительные счета', 'Открытые ПИФы', 'Биржевые ПИФы', 'Золото', 'ЦФА', 'Другие финансовые решения']

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-28T12:00:00Z'))
})

test('root renders one vertical catalogue without legacy navigation or route screens', async ({ page }) => {
  await page.goto('./')
  const app = page.locator('main[data-app="SinglePageApp"]')
  await expect(app).toBeVisible()
  await expect(page.locator('aside, nav, .app-shell, .sidebar, .drawer, .menu-button, .topbar, .mini-categories, [role="tablist"], canvas, svg.recharts-surface')).toHaveCount(0)
  await expect(app.locator('.product-group > h2')).toHaveText(groups)
  await expect(page.getByLabel('Сумма размещения, ₽')).toHaveValue('1000000')
  await expect(page.getByLabel('Горизонт', { exact: true })).toHaveValue('12')
  for (const name of groups) {
    const heading = page.getByRole('heading', { name, exact: true })
    await heading.scrollIntoViewIfNeeded()
    await expect(heading).toBeInViewport()
  }

  await expect(page.getByRole('region', { name: 'Открытые ПИФы' }).getByRole('article')).toHaveCount(12)
  await expect(page.getByRole('region', { name: 'Биржевые ПИФы' }).getByRole('article')).toHaveCount(4)
  const names = await page.getByRole('region', { name: 'Открытые ПИФы' }).locator('.mini-identity > strong').allTextContents()
  expect(names.slice(0, 3)).toEqual(['Финансовая подушка', 'Оборонный', 'Просто. Облигации'])
  await expect(page.getByRole('button', { name: /^Финансовая подушка/ })).not.toContainText('₽')
  await expect(page.getByRole('button', { name: /^Хранитель/ })).toContainText('Архивный продукт')

  for (const hash of ['#portfolio', '#archive', '#analytics', '#tax', '#products']) {
    await page.goto('./' + hash)
    await expect(app).toBeVisible()
    await expect(app.locator('.product-group > h2')).toHaveText(groups)
  }
  await page.evaluate(() => localStorage.setItem('dynamic-invest:settings:v2', '{"theme":"dark"}'))
  await page.reload()
  await expect(app).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('dynamic-invest:settings:v2'))).toBe('{"theme":"dark"}')
})

test('amount, horizon and the bank tax switch recalculate inline panels without closing them', async ({ page }) => {
  await page.goto('./')
  const card = (name: RegExp) => page.getByRole('article').filter({ has: page.getByRole('button', { name }) })
  const bank = card(/^Вектор/)
  const fund = card(/^Финансовая подушка/)
  await bank.getByRole('button').click()
  await fund.getByRole('button').click()
  const bankProfit = bank.locator('[data-bank-profit]')
  const initialProfit = await bankProfit.textContent()
  const result = fund.getByRole('region', { name: 'Осторожный' })
  await expect(result).toContainText(/69\s600\s*₽/)
  await page.getByLabel('Сумма размещения, ₽').fill('2000000')
  await expect(result).toContainText(/139\s200\s*₽/)
  await expect(bankProfit).not.toHaveText(initialProfit!)
  const freeProfit = await bankProfit.textContent()
  await page.getByRole('button', { name: 'Лимит использован' }).click()
  await expect(bankProfit).not.toHaveText(freeProfit!)
  await expect(result).toContainText(/139\s200\s*₽/)
  await page.getByLabel('Горизонт', { exact: true }).selectOption('6')
  await expect(fund.locator('.mini-slide')).toContainText('6 месяцев')
  await expect(fund.locator('.mini-slide')).toBeVisible()
  await expect(bank.locator('.mini-slide')).toBeVisible()
  await fund.getByRole('button').click()
  await expect(bank.locator('.mini-slide')).toBeVisible()
  await expect(fund.locator('.mini-slide')).toBeHidden()
})

test('year changes use dated observations in the same document', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => { document.body.dataset.documentIdentity = 'original' })
  const url = page.url()
  await page.getByLabel('Исторический год').selectOption('2023')
  await expect(page.getByRole('button', { name: /^Мои возможности/ })).toContainText('Историческое наблюдение')
  await expect(page.getByRole('button', { name: /^Вектор/ })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Биржевые ПИФы' }).getByRole('article')).toHaveCount(0)
  await page.getByLabel('Исторический год').selectOption('2024')
  await expect(page.getByRole('button', { name: /^Народный вклад плюс/ })).toBeVisible()
  await expect(page.locator('body')).toHaveAttribute('data-document-identity', 'original')
  expect(page.url()).toBe(url)
})

for (const width of [360, 768, 1024, 1440]) {
  test(`full vertical catalogue fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'Параметры расчёта', exact: true }).click()
    await expect(page.getByLabel('Расчётный лимит для неполного года, ₽')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'Параметры расчёта', exact: true }).click()
    const positions = await page.locator('.mini-scenarios').first().locator(':scope > span').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top))
    expect(new Set(positions).size).toBe(1)
    await expect(page.getByRole('heading', { name: 'Источники и дата обновления' })).toBeVisible()
    await page.getByRole('button', { name: /^Вектор/ }).click()
    await page.getByRole('button', { name: /^Финансовая подушка/ }).click()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    if (process.env.DI_SCREENSHOTS) {
      await mkdir(process.env.DI_SCREENSHOTS, { recursive: true })
      await page.screenshot({ path: `${process.env.DI_SCREENSHOTS}/single-page-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  })
}
