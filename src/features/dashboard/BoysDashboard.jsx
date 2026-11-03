import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyProfileModal } from '../boys/BoyProfile'
import { DateModeField, Kpi, KpiRow } from './parts'
import { BoysSections } from './boys/BoysSections'
import { TodayCheckModal } from './boys/TodayCheckModal'
import { useBoysDashboard } from './boys/useBoysDashboard'
import './dashboard.css'

/** Names across the class groups of a section, for its channel count. */
const groupCount = (groups) =>
  Object.values(groups || {}).reduce((n, rows) => n + rows.length, 0)

/**
 * BoysDashboard — "أداء الأولاد".
 *
 * One GET /dashboard/summary drives every card and seven channel buttons swap
 * the section underneath them, so only one section is open at a time (the same
 * shape as «أداء الخدام»). The class picker and the period are query params, so
 * changing one re-requests; the streak section adds its own Friday range.
 */
export default function BoysDashboard() {
  usePageTitle('أداء الأولاد')
  const { classLabel } = useAuth()
  const [checkOpen, setCheckOpen] = useState(false)

  const dash = useBoysDashboard()
  const {
    section,
    setSection,
    classes,
    classId,
    setClassId,
    dateMode,
    setDateMode,
    coverTab,
    setCoverTab,
    trendN,
    setTrendN,
    streakN,
    setStreakN,
    streakFrom,
    setStreakFrom,
    streakTo,
    setStreakTo,
    hasRange,
    absentN,
    setAbsentN,
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
    boy,
    openBoy,
    closeBoy,
  } = dash

  const channels = [
    { key: 'att', label: 'نسبة الحضور', icon: 'percent', count: byClass.length },
    { key: 'curve', label: 'منحنى الحضور', icon: 'chart', count: d?.boys_trend?.length },
    {
      key: 'cover',
      label: 'افتقاد الأولاد',
      icon: 'heart',
      count: cover ? cover.done_count + cover.todo_count : undefined,
    },
    {
      key: 'late',
      label: 'متأخرون عن الاعتراف',
      icon: 'history',
      count: late?.late_count,
    },
    { key: 'streak', label: 'المواظبون', icon: 'star', count: groupCount(d?.streaks) },
    {
      key: 'absent',
      label: 'غياب آخر جمعة',
      icon: 'alert',
      count: d?.last_friday?.absent_count,
    },
    {
      key: 'frequent',
      label: 'الغياب المتكرر',
      icon: 'clipboard',
      count: groupCount(d?.frequent_absent),
    },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head__sub">
            {d
              ? `${d.counts.boys} ولد · ${d.counts.fridays} جمعة مسجلة`
              : 'مؤشرات الحضور والمواظبة'}
          </div>
        </div>
      </div>

      <div className="dash-channels" role="tablist" aria-label="أقسام أداء الأولاد">
        {channels.map((channel) => (
          <button
            key={channel.key}
            type="button"
            role="tab"
            aria-selected={section === channel.key}
            className={`dash-channel${section === channel.key ? ' is-active' : ''}`}
            onClick={() => setSection(channel.key)}
          >
            <span className="dash-channel__icon">
              <Icon name={channel.icon} size={18} />
            </span>
            <span className="dash-channel__label">{channel.label}</span>
            {channel.count !== undefined && (
              <span className="dash-channel__count">{channel.count}</span>
            )}
          </button>
        ))}
      </div>

      <Toolbar>
        {classes.length > 1 && (
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="select--plain"
            style={{ minWidth: 190 }}
            aria-label="اختيار الفصل"
            searchable
            searchPlaceholder="ابحث باسم الفصل..."
          >
            {showAll && <option value="">كل الفصول</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <DateModeField value={dateMode} onChange={setDateMode} />
        <Button
          variant="secondary"
          icon={<Icon name="check" size={15} />}
          onClick={() => setCheckOpen(true)}
        >
          فحص اليوم
        </Button>
        <ToolbarSpacer />
        <span className="small muted">آخر جمعة مسجلة: {d?.last_friday?.date || '—'}</span>
      </Toolbar>

      <div className="dash">
        {a && (
          <KpiRow>
            <Kpi
              hero
              value={`${a.percent}%`}
              label="نسبة حضور الأولاد"
              progress={a.percent}
              sub={`حاضر ${a.present} • غائب ${a.absent} • الكل ${a.total}`}
            />
            <Kpi
              value={`${a.liturgy_percent}%`}
              label="حضور القداس"
              sub={`قداس ${a.liturgy_present} من ${a.total}`}
            />
            <Kpi value={d.counts.boys} label="الأولاد" />
            <Kpi value={d.counts.fridays} label="جمع مسجلة" />
          </KpiRow>
        )}

        <div className="dash-view">
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : loading && !d ? (
            <SkeletonRows rows={6} cols={4} />
          ) : d ? (
            <BoysSections
              view={section}
              data={d}
              byClass={byClass}
              cover={cover}
              late={late}
              coverGroups={coverGroups}
              coverTab={coverTab}
              setCoverTab={setCoverTab}
              trendN={trendN}
              setTrendN={setTrendN}
              streakN={streakN}
              setStreakN={setStreakN}
              streakFrom={streakFrom}
              setStreakFrom={setStreakFrom}
              streakTo={streakTo}
              setStreakTo={setStreakTo}
              hasRange={hasRange}
              absentN={absentN}
              setAbsentN={setAbsentN}
              openBoy={openBoy}
              classLabel={classLabel}
            />
          ) : null}
        </div>
      </div>

      <BoyProfileModal open={Boolean(boy)} boy={boy} onClose={closeBoy} />
      <TodayCheckModal open={checkOpen} onClose={() => setCheckOpen(false)} classId={classId} />
    </>
  )
}
