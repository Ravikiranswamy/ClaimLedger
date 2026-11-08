import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Spring Boot backend (Antigravity) is expected on :8080
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
