/**
 * push.js — the browser half of a notification.
 *
 * The server decides who receives what; this module only does the three things
 * a browser can do: ask permission, hold a push subscription, and hand that
 * subscription to the server so it can post to it later.
 *
 * Two realities shape the code:
 *
 * - A subscription belongs to the *browser*, not the login. Handing a phone to
 *   another servant re-saves the same endpoint under the new account, which is
 *   why every save is an upsert on the server.
 * - On iPhone a web app can only subscribe once it is installed to the Home
 *   Screen (iOS 16.4+). Safari gives no warning first, so the banner has to.
 */

import { NotificationAPI } from './endpoints.js'

const SW_URL = `${import.meta.env.BASE_URL}sw.js`

const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Running as an installed app (Home Screen / desktop) rather than in a tab. */
export const IS_STANDALONE =
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

/** An iPhone opened in Safari: the subscription will be refused until installed. */
export const needsHomeScreen = () => IS_IOS && !IS_STANDALONE

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/**
 * The worker is registered here, not in `main.jsx`.
 *
 * `main.jsx` registers it only in a production build, because a cached shell in
 * dev hides the next hot reload. Push needs a worker in dev too, so the people
 * testing it get one when they switch notifications on - and the worker caches
 * only built assets, never dev modules.
 */
export async function serviceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration()
  const registration = existing || (await navigator.serviceWorker.register(SW_URL))
  await navigator.serviceWorker.ready
  return registration
}

/** VAPID keys are base64url; `applicationServerKey` wants the raw bytes. */
function toApplicationServerKey(publicKey) {
  const padded = publicKey + '='.repeat((4 - (publicKey.length % 4)) % 4)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function save(subscription) {
  // A live PushSubscription, or the plain object one arrives from the worker.
  const json =
    typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription
  await NotificationAPI.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  })
  return json.endpoint
}

/**
 * Subscribe this browser and register it for the calling login.
 *
 * Throws with an Arabic message when the phone will not allow it; the caller
 * shows that and leaves the banner up.
 */
export async function enablePush() {
  if (!pushSupported()) {
    throw new Error('المتصفح ده مش بيدعم الإشعارات. جرّب Chrome على أندرويد.')
  }
  if (needsHomeScreen()) {
    throw new Error('على الآيفون لازم تضيف فصلي للشاشة الرئيسية الأول، وبعدها تفتح الإشعارات.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('الإشعارات مرفوضة من المتصفح. افتح إعدادات الموقع وسمّح الإشعارات.')
  }

  const registration = await serviceWorkerRegistration()
  if (!registration) throw new Error('خدمة الإشعارات مش متفعلة في المتصفح ده.')

  const { key } = await NotificationAPI.vapidKey()
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(key),
      })
    } catch (cause) {
      // A key saved from another server, or a site that blocked push entirely.
      if (cause?.name === 'AbortError') {
        throw new Error('المفتاح المحفوظ من سيرفر تاني. اعمل مسح لبيانات الموقع ثم أعد التشغيل.', {
          cause,
        })
      }
      throw new Error('المتصفح رفض الاشتراك. جرّب تاني بعد تحديث الصفحة.', { cause })
    }
  }
  await save(subscription)
  return true
}

/**
 * Re-save the subscription the browser already holds.
 *
 * Called when a login starts: the subscription outlives the token, so signing
 * in as a different servant on the same phone must move it to his account. Also
 * answers the worker's request when the push service rotates the endpoint.
 */
export async function syncPush() {
  if (!pushSupported()) return false
  if (Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false
  try {
    await save(subscription)
    return true
  } catch {
    return false
  }
}

/**
 * Replace a subscription the push service has retired.
 *
 * `syncPush` re-saves what the browser holds; here what the browser holds is
 * already dead, so the endpoint has to be asked for again - except on a browser
 * that hands the replacement over itself.
 */
export async function resubscribe(replacement = null) {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  if (replacement) return save(replacement).then(() => true)

  const registration = await serviceWorkerRegistration()
  if (!registration) return false
  const stale = await registration.pushManager.getSubscription()
  if (stale) await stale.unsubscribe().catch(() => {})

  const { key } = await NotificationAPI.vapidKey()
  const fresh = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toApplicationServerKey(key),
  })
  await save(fresh)
  return true
}

/** The worker asks for this when the push service changed our subscription. */
export function listenForResubscribe() {
  if (!('serviceWorker' in navigator)) return () => {}
  const handler = (event) => {
    if (event.data?.type === 'push:resubscribe') {
      resubscribe(event.data.replacement).catch(() => {})
    }
  }
  navigator.serviceWorker.addEventListener('message', handler)
  return () => navigator.serviceWorker.removeEventListener('message', handler)
}
