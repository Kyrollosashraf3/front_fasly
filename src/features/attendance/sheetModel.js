import { normalizeSearch } from '../../lib/search'

export const EMPTY_MARK = { present: false, liturgy: false, note: '' }

/** boyId -> working mark, seeded from the saved rows of this date. */
export function seedMarks(attends) {
  const next = {}
  for (const a of attends || []) {
    next[a.boy_id] = { present: a.present, liturgy: a.liturgy ?? false, note: a.note || '' }
  }
  return next
}

/** The saved row of each boy for this date, keyed by boy id. */
export function savedIndex(attends) {
  return new Map((attends || []).map((a) => [a.boy_id, a]))
}

/** A boy with a saved «حاضر» row for this date (a legacy false row is not). */
export function savedRecord(record) {
  return Boolean(record && (record.present || record.liturgy))
}

/** Does this boy's saved row differ from the working copy? */
export function rowDiffers(record, local) {
  if (!record) return false
  return (
    Boolean(record.present) !== Boolean(local.present) ||
    Boolean(record.liturgy) !== Boolean(local.liturgy) ||
    (record.note || '') !== (local.note || '')
  )
}

/** Search + gender + the smart present/absent views. */
export function filterBoys({ boys, query, gender, view, getMark }) {
  const q = normalizeSearch(query)
  return (boys || []).filter((b) => {
    if (gender !== 'all' && b.gender !== gender) return false
    if (q && !normalizeSearch(b.boy_name).includes(q) && !normalizeSearch(b.phone).includes(q)) return false
    if (view === 'present' && !getMark(b.id).present) return false
    // smart "absent" view: a boy only drops off the list once BOTH facts are
    // in — marked present AND marked mass. Ticking one of them keeps him here.
    if (view === 'absent' && getMark(b.id).present && getMark(b.id).liturgy) return false
    return true
  })
}

export function tally(boys, getMark) {
  let present = 0
  for (const b of boys || []) if (getMark(b.id).present) present += 1
  const total = (boys || []).length
  return { present, absent: total - present, total }
}

/**
 * boyId -> the most recent Friday recorded *before* this sheet, used for the
 * small "غاب الجمعة اللي فاتت" flag. A missing row means nothing was recorded.
 */
export function previousAbsentMap(history, date) {
  const map = new Map()
  for (const row of history || []) {
    if (String(row.date) >= date) continue
    if (row.present) continue
    const seen = map.get(row.boy_id)
    if (!seen || String(row.date) > String(seen)) map.set(row.boy_id, row.date)
  }
  return map
}

/** The ticked, not-yet-saved boys — the only rows a bulk save writes. */
export function saveItems(boys, isSaved, getMark) {
  return (boys || [])
    .filter((b) => !isSaved(b.id) && getMark(b.id).present)
    .map((b) => ({
      boy_id: b.id,
      present: true,
      liturgy: Boolean(getMark(b.id).liturgy),
      note: getMark(b.id).note || null,
    }))
}
