import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useQuery } from '../../../hooks'
import { DashboardAPI, TeacherAPI } from '../../../lib/endpoints'
import { normalizeSearch } from '../../../lib/search'
import { formatShort } from '../../../lib/format'

/** Filters, queries and derived rows behind «أداء الافتقاد». */
export function usePerformance() {
  const { user, classes, can } = useAuth()

  const [classId, setClassId] = useState('')
  const [period, setPeriod] = useState('month')
  const [teacherId, setTeacherId] = useState('')
  const [search, setSearch] = useState('')
  const [servantSearch, setServantSearch] = useState('')
  const [tab, setTab] = useState('todo')
  const [expanded, setExpanded] = useState(null)
  const [showUnvisitedOnly, setShowUnvisitedOnly] = useState(false)
  const [historyBoy, setHistoryBoy] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized && user?.teacher_id && !teacherId) {
      setTeacherId(String(user.teacher_id))
      setInitialized(true)
    }
  }, [user, initialized, teacherId])

  const showServantFilter = can.seeTeachersDashboard(user)
  const showAll = can.manageClasses(user) && classes.length > 1

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.followUpPerformance({
        ...(classId ? { class_id: classId } : {}),
        period,
        ...(teacherId ? { teacher_id: teacherId } : {}),
      }),
    [classId, period, teacherId],
  )

  const { data: teachers } = useQuery(
    () => TeacherAPI.list({ ...(classId ? { class_id: classId } : {}) }),
    [classId],
    { enabled: showServantFilter },
  )

  const d = data
  const totals = d?.totals

  const ranking = useMemo(() => {
    const rows = d?.ranking || []
    const q = normalizeSearch(search)
    return rows.filter((r) => {
      if (showUnvisitedOnly && r.followed) return false
      if (!showUnvisitedOnly) {
        if (tab === 'done' && !r.followed) return false
        if (tab === 'todo' && r.followed) return false
      }
      if (teacherId && String(r.servant_id || r.teacher_id || '') !== String(teacherId)) return false
      if (q && !normalizeSearch(r.boy_name).includes(q)) return false
      return true
    })
  }, [d, tab, search, teacherId, showUnvisitedOnly])

  const servantRows = useMemo(() => {
    const q = normalizeSearch(servantSearch)
    return q
      ? (d?.servants || []).filter((s) => normalizeSearch(s.teacher_name).includes(q))
      : d?.servants || []
  }, [d, servantSearch])

  const fromLabel = d?.scope?.period_from ? formatShort(d.scope.period_from) : 'البداية'

  return {
    classes,
    classId,
    setClassId,
    period,
    setPeriod,
    teacherId,
    setTeacherId,
    search,
    setSearch,
    servantSearch,
    setServantSearch,
    tab,
    setTab,
    expanded,
    setExpanded,
    showUnvisitedOnly,
    setShowUnvisitedOnly,
    historyBoy,
    setHistoryBoy,
    showServantFilter,
    showAll,
    data: d,
    totals,
    teachers,
    loading,
    error,
    refetch,
    ranking,
    servantRows,
    fromLabel,
  }
}
