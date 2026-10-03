/**
 * format.js — dates, ages and numbers for an Arabic (Egyptian) UI.
 * Dates stay ISO (YYYY-MM-DD) on the wire and are only formatted for display.
 */

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export const pad = (n) => String(n).padStart(2, '0')

/** `Date` | ISO string -> `YYYY-MM-DD` (what the API expects). */
export function toISO(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayISO = () => toISO(new Date())

/** Most recent Friday on or before `from` — the day the app records for. */
export function lastFridayISO(from = new Date()) {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const delta = (d.getDay() - 5 + 7) % 7
  d.setDate(d.getDate() - delta)
  return toISO(d)
}

function parseISO(value) {
  if (value instanceof Date) return value
  if (!value) return null
  // Date-only strings must be read as local time, not UTC.
  const str = String(value)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T12:00:00`) : new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

/** `2026-10-02` -> `الجمعة 2 أكتوبر 2026`. */
export function formatDate(value, { withDay = true } = {}) {
  const d = parseISO(value)
  if (!d) return '—'
  const day = withDay ? `${AR_DAYS[d.getDay()]}، ` : ''
  return `${day}${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** `2026-10-02` -> `2 أكتوبر` (compact, for tables). */
export function formatShort(value) {
  const d = parseISO(value)
  if (!d) return '—'
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()].slice(0, 6)}`
}

export function formatDateTime(value) {
  const d = parseISO(value)
  if (!d) return '—'
  return `${formatDate(d)} — ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Age from a birth date, evaluated today. Returns null when unknown. */
export function calcAge(birthDate) {
  const b = parseISO(birthDate)
  if (!b) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
  return age >= 0 ? age : null
}

export const formatPercent = (value, digits = 0) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? '—'
    : `${Number(value).toFixed(digits)}%`

export const num = (value) =>
  value === null || value === undefined ? '0' : String(value)

/** "مينا فؤاد حنا" -> "م ف ح" (avatar initials, max 2 letters). */
export function initials(name) {
  if (!name) return '؟'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last) || first || '؟'
}

/** Basename of a map link / WhatsApp deep link — shown, not the whole URL. */
export function shortLink(url) {
  if (!url) return ''
  return String(url).replace(/^https?:\/\//, '').slice(0, 48)
}

export function plural(n, { one, few, many }) {
  if (n === 1) return one
  if (n === 2) return few
  return many ?? one
}

/** Egyptian-colloquial counts used across empty states: "3 أولاد". */
export const boysWord = (n) => (n === 1 ? 'ولد' : 'أولاد')
export const servantWord = (n) => (n === 1 ? 'خادم' : 'خدام')
