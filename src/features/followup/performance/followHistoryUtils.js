/** One row per follow-up — API may repeat the newest entry in ``history``. */
export function uniqueFollowHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return []
  const seen = new Set()
  const out = []
  for (const h of history) {
    const key =
      h.id != null && h.id !== ''
        ? String(h.id)
        : `${h.date ?? ''}|${h.status ?? ''}|${h.teacher_id ?? ''}|${h.note ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
  }
  return out
}
