/**
 * api.js — the single HTTP client for the whole app.
 *
 * - Everything is same-origin: in dev Vite proxies the API prefixes to
 *   FastAPI, in prod VITE_API_BASE points at it ("" = same origin).
 * - Auth is a Bearer token kept in localStorage; a 401 means the session is
 *   over, so we clear it and let <RequireAuth> bounce to the login page.
 * - Errors always surface as ApiError with a friendly Arabic message and the
 *   raw `detail` payload so forms can show field-level problems.
 */

const RAW_BASE = import.meta.env.VITE_API_BASE ?? ''
export const API_BASE = RAW_BASE.replace(/\/$/, '')

const TOKEN_KEY = 'fasly_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/** Status -> Arabic message. The server's `detail` wins when it is a string. */
const FRIENDLY = {
  400: 'طلب غير صحيح. راجع البيانات المدخلة.',
  401: 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
  403: 'لا تملك صلاحية لهذا الإجراء.',
  404: 'السجل غير موجود. ربما تم حذفه.',
  409: 'فيه تعارض مع بيانات موجودة بالفعل.',
  422: 'البيانات المدخلة غير مكتملة.',
  429: 'طلبات كثيرة. انتظر قليلًا وحاول مجددًا.',
  500: 'خطأ في السيرفر. حاول لاحقًا.',
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' && detail ? detail : FRIENDLY[status] || 'حدث خطأ غير متوقع.')
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  /** Pydantic 422 -> { field: message } so a form can paint inputs red. */
  get fields() {
    if (!Array.isArray(this.detail)) return {}
    const out = {}
    for (const item of this.detail) {
      const loc = item?.loc || []
      const key = loc[loc.length - 1]
      if (key && key !== 'body' && !out[key]) out[key] = item.msg
    }
    return out
  }
}

/** Fired on 401 so the auth layer can log out exactly once. */
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function parseBody(res) {
  if (res.status === 204) return null
  const type = res.headers.get('content-type') || ''
  if (type.includes('application/json')) return res.json()
  if (type.includes('spreadsheet') || type.includes('octet-stream')) return res.blob()
  const text = await res.text()
  return text || null
}

async function request(path, { method = 'GET', body, formData, signal, raw = false } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let payload
  if (formData) payload = formData
  else if (body !== undefined) payload = JSON.stringify(body)

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: payload,
      signal,
    })
  } catch {
    throw new ApiError(0, 'لا يمكن الوصول للسيرفر. تأكد من الاتصال.')
  }

  if (!res.ok) {
    const detail = await parseBody(res).catch(() => null)
    if (res.status === 401) {
      clearToken()
      onUnauthorized?.()
    }
    const err = new ApiError(res.status, detail?.detail ?? detail)
    err.retryAfter = res.headers.get('Retry-After')
    throw err
  }

  if (raw) return res
  return parseBody(res)
}

/**
 * Login is the one endpoint FastAPI expects as form data
 * (`OAuth2PasswordRequestForm`: username = email, password).
 */
async function login(email, password) {
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)

  let res
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
  } catch {
    throw new ApiError(0, 'لا يمكن الوصول للسيرفر. تأكد من الاتصال.')
  }

  const data = await parseBody(res)
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.')
    throw new ApiError(res.status, data?.detail ?? data)
  }
  return data
}

function qs(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ''
}

export const api = {
  get: (path, params) => request(path + qs(params)),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  upload: (path, file, field = 'file') => {
    const form = new FormData()
    form.append(field, file, file.name)
    return request(path, { method: 'POST', formData: form })
  },
  /** Returns a Response so the caller can stream it into a download. */
  raw: (path, params) => request(path + qs(params), { raw: true }),
  login,
}

/** Triggers a browser download for any GET endpoint (xlsx exports, templates). */
export async function download(path, params, filename) {
  const res = await api.raw(path, params)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
