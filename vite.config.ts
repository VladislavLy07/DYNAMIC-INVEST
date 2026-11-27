import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/DYNAMIC-INVEST/',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
})
