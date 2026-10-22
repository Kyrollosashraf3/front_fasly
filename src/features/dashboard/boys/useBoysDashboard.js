import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useQuery } from '../../../hooks'
import { DashboardAPI } from '../../../lib/endpoints'
import { useBoyDrawer } from '../parts'

/** State + query for «أداء الأولاد». */
export function useBoysDashboard() {
  const { user, classes, can } = useAuth()

  const [classId, setClassId] = useState('')
  const [dateMode, setDateMode] = useState('last_friday')
  const [streakN, setStreakN] = useState(4)
  const [absentN, setAbsentN] = useState(4)
  const [trendN, setTrendN] = useState(8)
  const [coverTab, setCoverTab] = useState('todo')
  const [boy, openBoy, closeBoy] = useBoyDrawer()

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.summary({
        ...(classId ? { class_id: classId } : {}),
        date_mode: dateMode,
        streak_n: streakN,
        absent_n: absentN,
        trend_n: trendN,
      }),
    [classId, dateMode, streakN, absentN, trendN],
  )

  const d = data
  const a = d?.attendance
  const showAll = can.manageClasses(user) && classes.length > 1

  const byClass = (a?.by_class ? Object.entries(a.by_class) : [])
    .filter(([, v]) => v.total > 0)
    .sort((x, y) => y[1].percent - x[1].percent)

  const cover = d?.follow?.boys
  const late = d?.confession?.boys
  const coverGroups = coverTab === 'done' ? cover?.done : cover?.todo

  return {
    classes,
    classId,
    setClassId,
    dateMode,
    setDateMode,
    streakN,
    setStreakN,
    absentN,
    setAbsentN,
    trendN,
    setTrendN,
    coverTab,
    setCoverTab,
    boy,
    openBoy,
    closeBoy,
    showAll,
    data: d,
    attendance: a,
    loading,
    error,
    refetch,
    byClass,
    cover,
    late,
    coverGroups,
  }
}
