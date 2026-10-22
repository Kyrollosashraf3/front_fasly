import { useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useQuery } from '../../../hooks'
import { DashboardAPI, CheckAPI, TeacherAPI } from '../../../lib/endpoints'
import { lastFridayISO, todayISO } from '../../../lib/format'

/** State, query and derived totals for «أداء الخدام». */
export function useTeachersDashboard() {
  const { user, classes, can } = useAuth()

  const [classId, setClassId] = useState('')
  const [dateMode, setDateMode] = useState('last_friday')
  const [topN, setTopN] = useState(5)
  const [trendN, setTrendN] = useState(8)
  const [coverTab, setCoverTab] = useState('todo')
  const [absentMode, setAbsentMode] = useState('last_friday')

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.summary({
        ...(classId ? { class_id: classId } : {}),
        date_mode: dateMode,
        top_n: topN,
        teacher_trend_n: trendN,
      }),
    [classId, dateMode, topN, trendN],
  )

  // «خدام غابوا» has its own day: today or the most recent Friday. It is
  // independent from the period filter that drives the scores below.
  const absentDate = absentMode === 'today' ? todayISO() : lastFridayISO()
  const absentQuery = useQuery(
    async () => {
      const [checks, teachers] = await Promise.all([
        CheckAPI.list({
          ...(classId ? { class_id: classId } : {}),
          action_date: absentDate,
        }),
        TeacherAPI.list({ ...(classId ? { class_id: classId } : {}) }).catch(() => []),
      ])
      return { checks, teachers }
    },
    [classId, absentDate],
  )

  const d = data
  const showAll = can.manageClasses(user) && classes.length > 1

  const sum = (key) => (d?.servants || []).reduce((n, s) => n + s[key], 0)
  const totalChecks = sum('checks')
  const attendPct = totalChecks ? Math.round((sum('attend') / totalChecks) * 100) : 0
  const avg = d?.servants?.length
    ? (sum('score') / d.servants.length).toFixed(1)
    : '—'

  const cover = d?.follow?.servants
  const late = d?.confession?.servants
  const coverGroups = coverTab === 'done' ? cover?.done : cover?.todo

  const teacherById = useMemo(
    () => new Map((absentQuery.data?.teachers || []).map((t) => [t.id, t])),
    [absentQuery.data],
  )

  /** Servants marked absent (attend = false) on the chosen day. */
  const absentServants = useMemo(() => {
    return (absentQuery.data?.checks || [])
      .filter((c) => c.attend === false)
      .map((c) => {
        const t = teacherById.get(c.teacher_id)
        return {
          teacher_id: c.teacher_id,
          teacher_name: t?.teacher_name || `خادم #${c.teacher_id}`,
          class_id: c.class_id,
          phone: t?.phone,
          phone_2: t?.phone_2,
        }
      })
      .sort((a, b) =>
        String(a.teacher_name).localeCompare(String(b.teacher_name), 'ar'),
      )
  }, [absentQuery.data, teacherById])

  /**
   * The servants who came (attend > 0) yet scored between 1 and 3 out of 5
   * during the period — the ones the amin should follow up. Their missing
   * ticks are rendered beside each name.
   */
  const needsFollow = useMemo(() => {
    return [...(d?.servants || [])]
      .filter((s) => {
        const score = Number(s.score ?? 0)
        return Number(s.attend ?? 0) > 0 && score > 0 && score < 4
      })
      .map((s) => {
        const t = teacherById.get(s.teacher_id)
        return { ...s, phone: t?.phone, phone_2: t?.phone_2 }
      })
      .sort((a, b) => {
        const sa = Number(a.score ?? 0)
        const sb = Number(b.score ?? 0)
        if (sa !== sb) return sa - sb
        return String(a.teacher_name || '').localeCompare(String(b.teacher_name || ''), 'ar')
      })
  }, [d, teacherById])

  return {
    classes,
    classId,
    setClassId,
    dateMode,
    setDateMode,
    topN,
    setTopN,
    trendN,
    setTrendN,
    coverTab,
    setCoverTab,
    showAll,
    data: d,
    loading,
    error,
    refetch,
    sum,
    totalChecks,
    attendPct,
    avg,
    cover,
    late,
    coverGroups,
    needsFollow,
    absentMode,
    setAbsentMode,
    absentDate,
    absentServants,
    absentHasSession: Boolean(absentQuery.data?.checks?.length),
    absentLoading: absentQuery.loading,
    absentError: absentQuery.error,
    absentRefetch: absentQuery.refetch,
  }
}
