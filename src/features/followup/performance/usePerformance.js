import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useQuery } from '../../../hooks'
import { DashboardAPI, TeacherAPI } from '../../../lib/endpoints'
import { normalizeSearch } from '../../../lib/search'
import { classesForStage } from '../../../lib/stages'
import { formatShort } from '../../../lib/format'

/** Filters, queries and derived rows behind «أداء الافتقاد». */
export function usePerformance() {
  const { user, classes, can, canPickClass, allClassesLabel } = useAuth()

  const [classId, setClassId] = useState('')
  const [stage, setStage] = useState('')
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
  const showAll = canPickClass

  // A stage narrows the class menu itself and, with no specific class picked,
  // scopes the whole page to that stage's classes (the servant filter resets).
  const visibleClasses = useMemo(() => classesForStage(classes, stage), [classes, stage])
  const stageIds = stage ? visibleClasses.map((c) => c.id).join(',') : ''
  const pickStage = (next) => {
    setStage(next)
    setClassId('')
    setTeacherId('')
  }

  /** One class to query, the stage's classes, or null = every class. */
  const scopedClassIds = useMemo(() => {
    if (classId) return [String(classId)]
    if (stage) return visibleClasses.map((c) => String(c.id))
    return null
  }, [classId, stage, visibleClasses])

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.followUpPerformance({
        ...(classId ? { class_id: classId } : stageIds ? { class_ids: stageIds } : {}),
        period,
        ...(teacherId ? { teacher_id: teacherId } : {}),
      }),
    [classId, stageIds, period, teacherId],
  )

  const { data: teachers } = useQuery(
    async () => {
      if (!scopedClassIds) return TeacherAPI.list({})
      const lists = await Promise.all(
        scopedClassIds.map((id) => TeacherAPI.list({ class_id: id }).catch(() => [])),
      )
      return lists.flat()
    },
    [scopedClassIds],
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
    stage,
    pickStage,
    visibleClasses,
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
    allClassesLabel,
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
