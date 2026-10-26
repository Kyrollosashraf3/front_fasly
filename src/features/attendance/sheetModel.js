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
 * boyId -> the Friday he missed *right before* this sheet, used for the small
 * "غاب الجمعة اللي فاتت" flag.
 *
 * The anchor is the last Friday the class actually has a sheet for — not the
 * last absence. Anchoring to an older absence would leave the ✕ beside a boy
 * who came last Friday, and would also bring it back once his make-up for that
 * Friday is saved and the search falls through to an even older absence.
 * A missing row means nothing was recorded that Friday.
 */
export function previousAbsentMap(history, date) {
  const rows = (history || []).filter((row) => String(row.date) < date)
  if (!rows.length) return new Map()

  let last = ''
  for (const row of rows) {
    const day = String(row.date)
    if (day > last) last = day
  }

  const map = new Map()
  for (const row of rows) {
    if (String(row.date) !== last || row.present) continue
    map.set(row.boy_id, row.date)
  }
  return map
}

/**
 * The pending make-up ticks grouped by the Friday they belong to.
 * `makeup` is the set of boy ids whose ✕ was switched to a ✓; each one is
 * written as «حاضر» on the Friday he was flagged absent for.
 */
export function makeupBatches(makeup, previousAbsent) {
  const batches = new Map()
  for (const boyId of makeup || []) {
    const day = previousAbsent.get(boyId)
    if (!day) continue
    const key = String(day)
    if (!batches.has(key)) batches.set(key, [])
    batches.get(key).push({ boy_id: boyId, present: true, liturgy: false })
  }
  return [...batches.entries()].map(([day, items]) => ({ date: day, items }))
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
