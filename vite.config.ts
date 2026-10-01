import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

export default defineConfig(({ command }) => ({
  base: '/nutritrack/',
  plugins: [react()],
  server: {
    ...(command === 'serve' && fs.existsSync('.cert/localhost-key.pem') && fs.existsSync('.cert/localhost.pem') ? {
      https: {
        key: fs.readFileSync('.cert/localhost-key.pem'),
        cert: fs.readFileSync('.cert/localhost.pem'),
      },
    } : {}),
    proxy: {
      '/api/off-search': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/off-search/, '/cgi/search.pl'),
      },
    },
  },
}))
