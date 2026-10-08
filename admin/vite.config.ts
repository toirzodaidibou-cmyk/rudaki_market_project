import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Порт 5173 бояд бо Cors:AdminOrigins дар backend мувофиқ бошад.
  server: { port: 5173, strictPort: true },
})
