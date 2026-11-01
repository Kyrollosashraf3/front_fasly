import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useQuery } from '../../../hooks'
import { DashboardAPI } from '../../../lib/endpoints'
import { useBoyDrawer } from '../parts'

/** State + query for «أداء الأولاد». */
export function useBoysDashboard() {
  const { user, classes, can } = useAuth()

  const [section, setSection] = useState('att')
  const [classId, setClassId] = useState('')
  const [dateMode, setDateMode] = useState('last_friday')
  const [streakN, setStreakN] = useState(4)
  const [streakFrom, setStreakFromState] = useState('')
  const [streakTo, setStreakToState] = useState('')
  const [absentN, setAbsentN] = useState(4)
  const [trendN, setTrendN] = useState(8)
  const [coverTab, setCoverTab] = useState('todo')
  const [boy, openBoy, closeBoy] = useBoyDrawer()

  /** The range is one pair: an empty end takes the other's date, so a half-set
   *  range is impossible and clearing either end drops back to the trailing
   *  streak («عدد الجمع المتواصلة»). */
  const setStreakFrom = (value) => {
    setStreakFromState(value)
    setStreakToState(!value || value > streakTo ? value : streakTo || value)
  }
  const setStreakTo = (value) => {
    setStreakToState(value)
    setStreakFromState(!value || value < streakFrom ? value : streakFrom || value)
  }

  const hasRange = Boolean(streakFrom && streakTo)

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.summary({
        ...(classId ? { class_id: classId } : {}),
        date_mode: dateMode,
        streak_n: streakN,
        absent_n: absentN,
        trend_n: trendN,
        ...(hasRange ? { streak_from: streakFrom, streak_to: streakTo } : {}),
      }),
    [classId, dateMode, streakN, streakFrom, streakTo, absentN, trendN],
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
    section,
    setSection,
    classes,
    classId,
    setClassId,
    dateMode,
    setDateMode,
    streakN,
    setStreakN,
    streakFrom,
    setStreakFrom,
    streakTo,
    setStreakTo,
    hasRange,
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
