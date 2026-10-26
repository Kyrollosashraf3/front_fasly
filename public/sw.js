/**
 * فصلي — service worker.
 *
 * Scope: the app shell only (HashRouter means every screen is one document).
 *
 *   navigations  → network-first, fall back to the cached shell when offline.
 *   hashed build → cache-first, and prune old caches on activate.
 *   API prefixes → never touched. Attendance data must never go stale.
 */

const VERSION = 'fasly-shell-v2'
const SHELL = './index.html'

/** The API is mounted on the root, so name its prefixes explicitly. */
const API_PREFIXES = [
  '/auth',
  '/boys',
  '/teachers',
  '/classes',
  '/attendance',
  '/follow-ups',
  '/teacher-checks',
  '/groups',
  '/dashboard',
  '/trips',
  '/subscriptions',
  '/users',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(['./', SHELL]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (API_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy))
          return response
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || caches.match('./'))),
    )
    return
  }

  const destination = request.destination
  if (destination === 'script' || destination === 'style' || destination === 'font' || destination === 'image') {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone()
              caches.open(VERSION).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})