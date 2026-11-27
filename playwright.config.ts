import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  use: {
    baseURL: 'http://localhost:4173/DYNAMIC-INVEST/',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run preview -- --host localhost --port 4173 --strictPort',
    url: 'http://localhost:4173/DYNAMIC-INVEST/',
    reuseExistingServer: !process.env.CI,
    timeout: 25_000,
  },
})
