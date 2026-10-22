import { useEffect, useMemo, useState } from 'react'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { useDebounced, useQuery } from '../../hooks'
import { CheckAPI, TeacherAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { formatDate, lastFridayISO } from '../../lib/format'
import { EMPTY_MARK, FLAGS } from './constants'

/** State, queries and save/guard logic behind the servant check sheet. */
export function useTeacherCheckSheet({ classId, setPicked, canWrite }) {
  const toast = useToast()
  const modal = useModal()

  const [date, setDate] = useState(lastFridayISO())
  const [search, setSearch] = useState('')
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [teachers, checks] = await Promise.all([
        TeacherAPI.list({ class_id: classId }),
        CheckAPI.list({ class_id: classId, action_date: date }),
      ])
      return { teachers, checks }
    },
    [classId, date],
    { enabled: Boolean(classId) },
  )

  useEffect(() => {
    if (!data) return
    const next = {}
    for (const c of data.checks || []) {
      next[c.teacher_id] = {
        attend: c.attend,
        prepare: c.prepare,
        liturgy: c.liturgy,
        follow: c.follow,
        teachers_meeting: c.teachers_meeting,
        note: c.note || '',
      }
    }
    setMarks(next)
  }, [data])

  const getMark = (id) => marks[id] || EMPTY_MARK

  const setFlag = (id, flag, value) =>
    setMarks((m) => ({ ...m, [id]: { ...getMark(id), [flag]: value } }))

  const rows = useMemo(() => {
    const q = normalizeSearch(debounced)
    return (data?.teachers || []).filter((t) => !q || normalizeSearch(t.teacher_name).includes(q))
  }, [data, debounced])

  const dirty = useMemo(() => {
    if (!data) return false
    const server = new Map((data.checks || []).map((c) => [c.teacher_id, c]))
    for (const t of data.teachers || []) {
      const local = marks[t.id]
      const remote = server.get(t.id)
      if (!remote && !local) continue
      if (!remote) return true
      const l = local || EMPTY_MARK
      for (const f of FLAGS.map((x) => x.key)) {
        if (Boolean(l[f]) !== Boolean(remote[f])) return true
      }
      if ((l.note || '') !== (remote.note || '')) return true
    }
    return false
  }, [data, marks])

  const stats = useMemo(() => {
    const total = data?.teachers?.length || 0
    const done = (data?.teachers || []).filter((t) => getMark(t.id).attend).length
    return { total, done }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, marks])

  const setAllPresent = (value) => {
    setMarks((m) => {
      const next = { ...m }
      for (const t of data?.teachers || []) next[t.id] = { ...getMark(t.id), attend: value }
      return next
    })
  }

  const askNote = async (teacher) => {
    const note = await modal.prompt({ title: `ملاحظة — ${teacher.teacher_name}`, value: getMark(teacher.id).note })
    if (note !== null) setMarks((m) => ({ ...m, [teacher.id]: { ...getMark(teacher.id), note } }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await CheckAPI.saveBulk({
        date,
        items: (data?.teachers || []).map((t) => ({
          teacher_id: t.id,
          ...getMark(t.id),
          note: getMark(t.id).note || null,
        })),
      })
      toast.success(`تم حفظ متابعة ${formatDate(date)}.`)
      await refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Warn before leaving with a check sheet that still has unsaved ticks.
  useUnsavedGuard(canWrite && dirty, save, `فيه تعديلات متابعة لسه متحفظتش ليوم ${formatDate(date)}.`)

  /** Switching the date reloads the sheet — confirm first when it is dirty. */
  const changeDate = async (next) => {
    if (next === date) return
    if (canWrite && dirty) {
      const ok = await modal.confirm({
        title: 'تغيير التاريخ؟',
        message: 'فيه تعديلات متابعة لسه متحفظتش. لو غيّرت التاريخ هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setDate(next)
  }

  /** Switching the class reloads the sheet — confirm first when it is dirty. */
  const changeClass = async (next) => {
    if (!next || next === classId) return
    if (canWrite && dirty) {
      const ok = await modal.confirm({
        title: 'تغيير الفصل؟',
        message: 'فيه تعديلات متابعة لسه متحفظتش. لو غيّرت الفصل هتخسرها.',
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
    marks,
    saving,
    data,
    loading,
    error,
    refetch,
    rows,
    dirty,
    stats,
    getMark,
    setFlag,
    setAllPresent,
    askNote,
    save,
    changeDate,
    changeClass,
  }
}
