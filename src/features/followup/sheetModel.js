import { normalizeSearch } from '../../lib/search'

/** Which boys are on this sheet? (all, or one servant's group) */
export function rosterFor(boys, groups, teacherId) {
  const all = boys || []
  if (!teacherId) return all
  const group = (groups?.groups || []).find((g) => String(g.teacher_id) === String(teacherId))
  if (!group) return all
  const ids = new Set(group.boys.map((b) => b.boy_id))
  return all.filter((b) => ids.has(b.id))
}

/** boy_id -> the servant responsible for him (his group owner). */
export function groupOwnerMap(groups) {
  const map = new Map()
  for (const g of groups?.groups || []) {
    for (const b of g.boys) map.set(b.boy_id, g.teacher_id)
  }
  return map
}

/** boy_id -> the follow-up logged for him on the sheet date (newest first). */
export function followedByBoyMap(rows) {
  const map = new Map()
  for (const row of rows || []) {
    if (!map.has(row.boy_id)) map.set(row.boy_id, row)
  }
  return map
}

/** boy_id -> how many follow-ups were logged for him on the sheet date. */
export function logCountByBoy(rows) {
  const map = new Map()
  for (const row of rows || []) map.set(row.boy_id, (map.get(row.boy_id) || 0) + 1)
  return map
}

/** Search + the done/todo filter over the serialized follow-ups. */
export function filterRoster(roster, query, status, followed) {
  const q = normalizeSearch(query)
  return (roster || []).filter((b) => {
    const logged = followed?.has(b.id)
    if (q && !normalizeSearch(b.boy_name).includes(q) && !normalizeSearch(b.phone).includes(q)) return false
    if (status === 'done' && !logged) return false
    if (status === 'todo' && logged) return false
    return true
  })
}
