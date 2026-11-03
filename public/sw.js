/**
 * فصلي — service worker.
 *
 * Scope: the app shell only (HashRouter means every screen is one document).
 *
 *   navigations  → network-first, fall back to the cached shell when offline.
 *   hashed build → cache-first, and prune old caches on activate.
 *   API prefixes → never touched. Attendance data must never go stale.
 *
 * It is also the push receiver: a notification is shown here, in the worker,
 * which is the only place the browser wakes the app up for a message.
 */

const VERSION = 'fasly-shell-v2'
const SHELL = './index.html'
const ICON = './icons/icon-192.png?v=2'
const BADGE = './icons/icon-192.png?v=2'

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
  '/notifications',
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
  /* Only a built asset is cache-first: those names are content hashes, so the
     URL changing is the only way the bytes can change. In `vite dev` the
     modules live under /src and /node_modules, and caching them there would
     freeze the app against every hot reload. */
  const isBuildAsset = url.pathname.startsWith('/assets/')
  if (
    isBuildAsset &&
    (destination === 'script' || destination === 'style' || destination === 'font' || destination === 'image')
  ) {
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

/* ------------------------------------------------------------------ push */

/** The server posts JSON: what to show, and which page a tap opens. */
function payload(text) {
  try {
    return JSON.parse(text) || {}
  } catch {
    return {}
  }
}

self.addEventListener('push', (event) => {
  const data = payload(event.data && event.data.text())
  event.waitUntil(
    self.registration
      .showNotification(data.title || 'فصلي', {
        body: data.body || '',
        tag: data.tag,
        icon: ICON,
        badge: BADGE,
        lang: 'ar',
        dir: 'rtl',
        data: { url: data.url },
      })
      // The app keeps its own copy of every message in the header bell, so an
      // open tab is told to re-read it instead of waiting for its next minute.
      .then(() =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) =>
          Promise.all(windows.map((window) => window.postMessage({ type: 'push:received' }))),
        ),
      ),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || './', self.location)
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        // Reuse the open app so a tap does not stack a second copy of it.
        for (const window of windows) {
          if ('focus' in window) {
            window.navigate(target)
            return window.focus()
          }
        }
        return self.clients.openWindow(target)
      }),
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  // The push service rotated this subscription (or the app was cleared out).
  // Only the page has the VAPID key and the login token, so ask it to redo the
  // subscribe-and-save; until then the banner in the app comes back. A browser
  // that already hands over the replacement saves us the round trip.
  const replacement = event.newSubscription ? event.newSubscription.toJSON() : null
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) =>
        Promise.all(
          windows.map((window) => window.postMessage({ type: 'push:resubscribe', replacement })),
        ),
      ),
  )
})