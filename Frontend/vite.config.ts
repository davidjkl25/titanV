import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En Windows, `localhost` resuelve primero a IPv6 (::1). Si Vite escucha
    // solo en un stack, http://127.0.0.1:5173 queda sin conectar aunque el
    // backend lo permite por CORS. Con `host: true` responde en ambos.
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
