import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { stageLabel } from '../../lib/stages'
import { BoyProfileModal } from '../boys/BoyProfile'
import { DateModeField, Kpi, KpiRow, StageField } from './parts'
import { BoysSections } from './boys/BoysSections'
import { useBoysDashboard } from './boys/useBoysDashboard'
import './dashboard.css'

/**
 * BoysDashboard — "أداء الأولاد".
 *
 * One GET /dashboard/summary drives every card and seven channel buttons swap
 * the section underneath them, so only one section is open at a time (the same
 * shape as «أداء الخدام»). The class picker, the period and «فحص اليوم» are the
 * first thing on the screen and drive every section, and the summary numbers
 * belong to «نسبة الحضور» alone. (The buttons no longer carry count badges.)
 */
/** The picker's «كل الفصول» choice; as a query param it is no class at all. */
const ALL_CLASSES = 'all'

export default function BoysDashboard() {
  usePageTitle('أداء الأولاد')
  const { classLabel, allClassesLabel, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const dash = useBoysDashboard()
  const {
    section,
    setSection,
    classes,
    classId,
    setClassId,
    stage,
    pickStage,
    visibleClasses,
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
    { key: 'att', label: 'نسبة الحضور', icon: 'percent' },
    { key: 'curve', label: 'منحنى الحضور', icon: 'chart' },
    { key: 'cover', label: 'افتقاد الأولاد', icon: 'heart' },
    { key: 'late', label: 'متأخرون عن الاعتراف', icon: 'history' },
    { key: 'streak', label: 'المواظبون', icon: 'star' },
    { key: 'absent', label: 'غياب آخر جمعة', icon: 'alert' },
    { key: 'frequent', label: 'الغياب المتكرر', icon: 'clipboard' },
  ]

  return (
    <>
      {/* First thing on the screen: one class + period choice, and it drives
          every section below without having to be repeated. */}
      <Toolbar className="toolbar--dash">
        {classes.length > 1 && (
          <div className="dash-filters">
            <Select
              value={classId === '' ? ALL_CLASSES : classId}
              onChange={(e) => setClassId(e.target.value === ALL_CLASSES ? '' : e.target.value)}
              className="select--plain"
              aria-label="اختيار الفصل"
              searchable
              searchPlaceholder="ابحث باسم الفصل..."
            >
              {showAll && (
                <option value={ALL_CLASSES}>
                  {stage ? `كل ${stageLabel(stage)}` : allClassesLabel}
                </option>
              )}
              {visibleClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {isSuperAdmin && <StageField value={stage} onChange={pickStage} />}
          </div>
        )}
        <DateModeField value={dateMode} onChange={setDateMode} />
        <ToolbarSpacer />
        <span className="small muted">آخر جمعة مسجلة: {d?.last_friday?.date || '—'}</span>
      </Toolbar>

      <div className="page-head">
        <div>
          <div className="page-head__sub">
            {d
              ? `${d.counts.boys} ولد · ${d.counts.fridays} جمعة مسجلة`
              : 'مؤشرات الحضور والمواظبة'}
          </div>
        </div>
      </div>

      <div className="dash-channels">
        <div className="dash-channels__tabs" role="tablist" aria-label="أقسام أداء الأولاد">
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
            </button>
          ))}
        </div>

        <button
          type="button"
          className="dash-channel"
          onClick={() => navigate('/dashboard/boys/today-check')}
        >
          <span className="dash-channel__icon">
            <Icon name="check" size={18} />
          </span>
          <span className="dash-channel__label">فحص اليوم</span>
        </button>
      </div>

      {/* The summary numbers are the attendance section's own analysis, so they
          appear only under «نسبة الحضور». */}
      {section === 'att' && a && (
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

      <div className="dash">
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
    </>
  )
}
