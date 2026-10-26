import { useEffect, useMemo, useState } from 'react'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { useDebounced, useQuery } from '../../hooks'
import { AttendAPI, BoyAPI } from '../../lib/endpoints'
import { formatDate, lastFridayISO } from '../../lib/format'
import { useRowEdit } from './useRowEdit'
import {
  EMPTY_MARK,
  filterBoys,
  makeupBatches,
  previousAbsentMap,
  rowDiffers,
  saveItems,
  savedIndex,
  savedRecord,
  seedMarks,
  tally,
} from './sheetModel'

/**
 * All of the attendance sheet's state and side effects:
 *   - the working copy (`marks`) and the saved rows it is compared against,
 *   - the date / class / search / gender / view filters,
 *   - saving a new sheet, and editing or cancelling one saved boy,
 *   - guarding navigation while ticks are still unsaved.
 */
export function useAttendanceSheet({ classId, canWrite, canAdd, setPicked }) {
  const toast = useToast()
  const modal = useModal()

  const [date, setDate] = useState(lastFridayISO())
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('all')
  const [view, setView] = useState('all')
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)
  // Boy ids whose ✕ was switched to a temporary ✓: he says he was there that
  // Friday, so saving writes him «حاضر» on that earlier date.
  const [makeup, setMakeup] = useState(() => new Set())
  // Boy ids whose already-saved row is unlocked for a correction.
  const [editing, setEditing] = useState(() => new Set())
  const [addOpen, setAddOpen] = useState(false)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [boys, attends] = await Promise.all([
        BoyAPI.list({ class_id: classId }),
        AttendAPI.list({ class_id: classId, action_date: date }),
      ])
      return { boys, attends }
    },
    [classId, date],
    { enabled: Boolean(classId) },
  )

  /**
   * The whole Friday history of the class, once, regardless of the date being
   * edited — all it needs from it is "was he there the Friday before?".
   */
  const { data: history, refetch: refetchHistory } = useQuery(
    () => AttendAPI.list({ class_id: classId }),
    [classId],
    { enabled: Boolean(classId) },
  )

  // Seed the working copy whenever the source data changes.
  useEffect(() => {
    if (!data) return
    setMarks(seedMarks(data.attends))
  }, [data])

  const getMark = (boyId) => marks[boyId] || EMPTY_MARK

  const setMark = (boyId, patch) =>
    setMarks((m) => ({ ...m, [boyId]: { ...getMark(boyId), ...patch } }))

  const serverById = useMemo(() => savedIndex(data?.attends), [data])

  const isSaved = (boyId) => savedRecord(serverById.get(boyId))

  /** A saved boy is locked (his chips disabled) until he is opened to edit. */
  const isLocked = (boyId) => isSaved(boyId) && !editing.has(boyId)

  const rowChanged = (boyId) => rowDiffers(serverById.get(boyId), getMark(boyId))

  const { rowSaving, saveRow, cancelRow, persistRow } = useRowEdit({
    getMark,
    serverById,
    setMarks,
    setEditing,
    refetch,
    toast,
  })

  /**
   * Only brand-new ticks (boys with no saved present row) drive the global
   * save — a saved boy is changed on his own row through «تعديل» instead.
   */
  const dirty = useMemo(() => {
    for (const boy of data?.boys || []) {
      if (savedRecord(serverById.get(boy.id))) continue
      if (getMark(boy.id).present) return true
    }
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, marks, serverById])

  /** A saved boy opened for edit whose row has changed but is not saved yet. */
  const editingDirty = useMemo(() => {
    for (const id of editing) if (rowDiffers(serverById.get(id), getMark(id))) return true
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, marks, serverById])

  const unsaved = dirty || editingDirty || makeup.size > 0

  const rows = useMemo(
    () => filterBoys({ boys: data?.boys, query: debounced, gender, view, getMark }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, debounced, gender, view, marks],
  )

  const counts = useMemo(
    () => tally(data?.boys, getMark),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, marks],
  )

  const allDone =
    counts.total > 0 && counts.present + counts.absent === counts.total && counts.present === counts.total

  const previousAbsent = useMemo(
    () => previousAbsentMap(history, date),
    [history, date],
  )

  // A make-up tick only means something while that Friday is still the one he
  // is flagged for. Changing the date/class or refetching after a save rebuilds
  // the map, so drop any tick that no longer applies instead of writing a
  // make-up for a Friday the boy is no longer marked absent on.
  useEffect(() => {
    setMakeup((prev) => {
      if (!prev.size) return prev
      const next = new Set([...prev].filter((boyId) => previousAbsent.has(boyId)))
      return next.size === prev.size ? prev : next
    })
  }, [previousAbsent])

  /** Switch the previous-Friday ✕ of one boy to a temporary ✓ (and back). */
  const toggleMakeup = (boyId) => {
    if (!canWrite || !previousAbsent.has(boyId)) return
    setMakeup((prev) => {
      const next = new Set(prev)
      if (next.has(boyId)) next.delete(boyId)
      else next.add(boyId)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      // Only the ticked (present) boys are sent. A boy with no tick simply has
      // no row in the sheet — his absence is the default and is never written
      // as false, so he is left exactly as he already was.
      const items = saveItems(data?.boys, isSaved, getMark)

      // An empty sheet is valid (nobody showed up) — nothing to write, and the
      // API rejects an empty bulk, so the call is skipped.
      if (items.length) await AttendAPI.saveBulk({ date, items })

      // The corrected «he was actually there» ticks are written on the Friday
      // each one was flagged for — one bulk per date, because the payload
      // carries a single date.
      for (const batch of makeupBatches(makeup, previousAbsent))
        await AttendAPI.saveBulk(batch)

      // Any saved boy left open in edit mode is flushed alongside the new ticks.
      for (const id of editing) if (rowChanged(id)) await persistRow(id)
      setEditing(new Set())
      setMakeup(new Set())

      toast.success(`تم حفظ حضور ${formatDate(date)}.`)
      // The sheet and the history both move: the make-up rows belong to an
      // older Friday, so the flags are refreshed from the same source.
      await Promise.all([refetch(), refetchHistory()])
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Warn before leaving with a Friday sheet that still has unsaved ticks.
  useUnsavedGuard(canWrite && unsaved, save, `فيه تعديلات حضور لسه متحفظتش ليوم ${formatDate(date)}.`)

  /**
   * Opening the quick "add boy" form reloads the sheet, which would wipe any
   * ticks not saved yet — so offer to save them first.
   */
  const openAddBoy = async () => {
    if (canWrite && unsaved) {
      const ok = await modal.confirm({
        title: 'تحفظ الحضور الأول؟',
        message: 'فيه تعديلات حضور لسه متحفظتش. الأفضل تحفظها قبل ما تضيف ولد جديد عشان متضيعش.',
        confirmLabel: 'احفظ وكمّل',
        kind: 'primary',
      })
      if (!ok) return
      const ok2 = await save()
      if (!ok2) return
    }
    setAddOpen(true)
  }

  /** Switching the date reloads the sheet — confirm first when it is dirty. */
  const changeDate = async (next) => {
    if (next === date) return
    if (canWrite && unsaved) {
      const ok = await modal.confirm({
        title: 'تغيير التاريخ؟',
        message: 'فيه تعديلات حضور لسه متحفظتش. لو غيّرت التاريخ هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setDate(next)
  }

  /** Switching the class (global mode) reloads the sheet — confirm first. */
  const changeClass = async (next) => {
    if (!next || next === classId) return
    if (canWrite && unsaved) {
      const ok = await modal.confirm({
        title: 'تغيير الفصل؟',
        message: 'فيه تعديلات حضور لسه متحفظتش. لو غيّرت الفصل هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setPicked(next)
  }

  return {
    date,
    search,
    setSearch,
    gender,
    setGender,
    view,
    setView,
    addOpen,
    setAddOpen,
    data,
    loading,
    error,
    refetch,
    saving,
    editing,
    setEditing,
    rowSaving,
    getMark,
    setMark,
    isLocked,
    rowChanged,
    saveRow,
    cancelRow,
    save,
    openAddBoy,
    changeDate,
    changeClass,
    unsaved,
    rows,
    counts,
    allDone,
    previousAbsent,
    makeup,
    toggleMakeup,
  }
}
