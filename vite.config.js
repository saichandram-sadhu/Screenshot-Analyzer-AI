import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api/cohere': {
        target: 'https://api.cohere.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cohere/, ''),
      },
    },
  },
})
