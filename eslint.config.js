import js from '@eslint/js'
import ts from 'typescript-eslint'

export default [
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  { ...js.configs.recommended, files: ['scripts/**/*.mjs'], languageOptions: { globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', TextDecoder: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', AbortSignal: 'readonly', Date: 'readonly', Buffer: 'readonly' } } },
  ...ts.configs.recommended,
]
