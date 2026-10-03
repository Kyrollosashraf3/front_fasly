import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API lives on the FastAPI server (default :9003). In dev we proxy the
// handful of route prefixes it exposes so the browser stays same-origin and
// CORS never enters the picture. Anything else (VITE_API_BASE) is for prod.
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:9003'

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
  // Relative asset URLs: the build is mounted under a path (/ui) by FastAPI,
  // and the hash router never changes the document URL, so './' is always
  // resolved against the directory that holds index.html.
  base: './',
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 5174,
    proxy,
  },
  build: {
    // Served by FastAPI under /ui in a single-server deploy.
    outDir: '../back_fasly/app/static_react',
    emptyOutDir: true,
    sourcemap: false,
  },
})
