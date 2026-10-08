import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API lives on the FastAPI server (default :9001, see back_fasly/.env and
// START_Fasly.bat). In dev we proxy the handful of route prefixes it exposes
// so the browser stays same-origin and CORS never enters the picture.
// Anything else (VITE_API_BASE) is for prod.
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:9001'

const apiPrefixes = [
  '/auth',
  '/boys',
  '/teachers',
  '/classes',
  '/attendance',
  '/follow-ups',
  '/teacher-checks',
  '/groups',
  '/dashboard',
]

const proxy = Object.fromEntries(
  apiPrefixes.map((p) => [p, { target: API_TARGET, changeOrigin: true }]),
)

export default defineConfig({
  plugins: [react()],
  // The SPA is served from its own origin (vite dev :5173 / any static host);
  // the hash router never changes the document URL, so '/' is always the root.
  base: '/',
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 5174,
    proxy,
  },
  build: {
    // Standalone frontend - output stays inside front_fasly (dist/).
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
