import { useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useDebounced, useQuery } from '../../hooks'
import { BoyAPI, FollowUpAPI, GroupAPI, TeacherAPI } from '../../lib/endpoints'
import { todayISO } from '../../lib/format'
import {
  filterRoster,
  followedByBoyMap,
  groupOwnerMap,
  logCountByBoy,
  rosterFor,
} from './sheetModel'

/** Everything the follow-up sheet needs: rows, the day's log, filters and save. */
export function useFollowUpSheet({
  classId,
  setPicked,
  canWrite,
  isBoy,
  myTeacherId,
  canPickMentor = false,
}) {
  const toast = useToast()

  const [date, setDate] = useState(todayISO())
  const [teacherId, setTeacherId] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [saving, setSaving] = useState(false)
  const [historyDate, setHistoryDate] = useState('')
  const [revision, setRevision] = useState(0)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [boys, teachers, groups, existing] = await Promise.all([
        BoyAPI.list({ class_id: classId }),
        isBoy ? Promise.resolve([]) : TeacherAPI.list({ class_id: classId }).catch(() => []),
        isBoy ? Promise.resolve(null) : GroupAPI.list({ class_id: classId }).catch(() => null),
        FollowUpAPI.list({ class_id: classId, action_date: date }),
      ])
      return { boys, teachers, groups, existing }
    },
    [classId, date, isBoy],
    { enabled: Boolean(classId) },
  )

  const roster = useMemo(
    () => rosterFor(data?.boys, data?.groups, teacherId),
    [data, teacherId],
  )

  const groupOwnerByBoy = useMemo(() => groupOwnerMap(data?.groups), [data])

  /** Boys with a follow-up already logged on this sheet date. */
  const followedByBoy = useMemo(() => followedByBoyMap(data?.existing), [data])

  /** How many follow-ups each boy has on this sheet date (a boy may have more). */
  const countByBoy = useMemo(() => logCountByBoy(data?.existing), [data])

  const rows = useMemo(
    () => filterRoster(roster, debounced, status, followedByBoy),
    [roster, debounced, status, followedByBoy],
  )

  const counts = useMemo(
    () => ({
      done: roster.filter((b) => followedByBoy.has(b.id)).length,
      total: roster.length,
    }),
    [roster, followedByBoy],
  )

  const nameOfTeacher = (id) =>
    data?.teachers?.find((t) => t.id === id)?.teacher_name || `خادم #${id}`

  /** The servant a new log is credited to. A servant only ever logs himself. */
  const mentorFor = (boyId) => {
    if (!canPickMentor) return myTeacherId || ''
    return (
      groupOwnerByBoy.get(boyId) ??
      (teacherId ? Number(teacherId) : null) ??
      myTeacherId ??
      data?.teachers?.[0]?.id ??
      ''
    )
  }

  /**
   * Log another follow-up for the boy on that day, or edit one already logged.
   * Passing `editId` updates that row; otherwise a new row is always added —
   * the same boy may be followed up more than once on the same date.
   */
  const saveFollowUp = async (boy, values, { editId = null } = {}) => {
    const targetDate = values.action_date || date
    const teacher = values.teacher_id || mentorFor(boy.id)
    if (!editId && !teacher) {
      toast.error(`حدد الخادم المسؤول عن ${boy.boy_name}.`)
      return false
    }

    setSaving(true)
    try {
      if (editId) {
        await FollowUpAPI.update(editId, {
          status: values.status,
          note: values.note || null,
          action_date: targetDate,
        })
      } else {
        await FollowUpAPI.create({
          teacher_id: Number(teacher),
          boy_id: boy.id,
          status: values.status,
          action_date: targetDate,
          note: values.note || null,
        })
      }
      toast.success(editId ? 'تم تعديل الافتقاد.' : 'تم تسجيل افتقاد جديد.')
      await refetch()
      setRevision((n) => n + 1)
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const changeDate = (next) => {
    if (next && next !== date) setDate(next)
  }

  /** Switching the class drops the selected servant (he belongs to the old one). */
  const changeClass = (next) => {
    if (!next || next === classId) return
    setPicked(next)
    setTeacherId('')
  }

  return {
    date,
    teacherId,
    setTeacherId,
    search,
    setSearch,
    status,
    setStatus,
    saving,
    historyDate,
    setHistoryDate,
    revision,
    data,
    loading,
    error,
    refetch,
    roster,
    rows,
    counts,
    followedByBoy,
    countByBoy,
    canWrite,
    mentorFor,
    nameOfTeacher,
    saveFollowUp,
    changeDate,
    changeClass,
  }
}
