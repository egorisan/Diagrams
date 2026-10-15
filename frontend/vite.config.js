import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:8000'
const proxied = ['/auth', '/projects', '/diagrams', '/payments', '/admin']

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: Object.fromEntries(
      proxied.map((p) => [p, { target: apiTarget, changeOrigin: true }])
    ),
  },
})
