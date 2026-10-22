import { useState } from 'react'
import { AttendAPI } from '../../lib/endpoints'

/**
 * Editing one already-saved boy: his row is unlocked, corrected and saved on
 * its own (or thrown away) without touching the rest of the sheet.
 */
export function useRowEdit({ getMark, serverById, setMarks, setEditing, refetch, toast }) {
  const [rowSaving, setRowSaving] = useState(null)

  /**
   * Persist one already-saved boy: refresh his row while present, remove it
   * when he is unticked — so an absent boy keeps no row at all.
   */
  const persistRow = async (boyId) => {
    const record = serverById.get(boyId)
    if (!record) return
    const mark = getMark(boyId)
    if (mark.present) {
      await AttendAPI.update(record.id, {
        present: true,
        liturgy: Boolean(mark.liturgy),
        note: mark.note || null,
      })
    } else {
      await AttendAPI.remove(record.id)
    }
  }

  /** Save one opened boy on his own row, without touching anyone else. */
  const saveRow = async (boyId) => {
    setRowSaving(boyId)
    try {
      await persistRow(boyId)
      toast.success('تم تعديل الحضور.')
      setEditing((s) => {
        const next = new Set(s)
        next.delete(boyId)
        return next
      })
      await refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setRowSaving(null)
    }
  }

  /** Leave edit mode, throwing the row's local change away. */
  const cancelRow = (boyId) => {
    const record = serverById.get(boyId)
    if (record) {
      setMarks((m) => ({
        ...m,
        [boyId]: { present: record.present, liturgy: record.liturgy ?? false, note: record.note || '' },
      }))
    }
    setEditing((s) => {
      const next = new Set(s)
      next.delete(boyId)
      return next
    })
  }

  return { rowSaving, saveRow, cancelRow, persistRow }
}
