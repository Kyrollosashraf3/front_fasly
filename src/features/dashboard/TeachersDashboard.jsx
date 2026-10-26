import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { DateModeField } from './parts'
import { AbsentServantsList } from './teachers/AbsentServantsList'
import {
  LateConfessionView,
  PerformanceView,
  TopServantsView,
} from './teachers/TeachersSections'
import { useTeachersDashboard } from './teachers/useTeachersDashboard'
import './dashboard.css'

/**
 * TeachersDashboard — «أداء الخدام».
 *
 * One screen with four channels on top; each channel swaps the view instead of
 * stacking every section. «أداء الخدام» is the curve with its metric / best-
 * worst / order filters, «أفضل الخدام» the score ranking, «خدام غابوا» the
 * absence log of a chosen day and «متأخرون عن الاعتراف» the confession list.
 *
 * Score = true flags summed across checks
 * (attend + prepare + liturgy + follow + teachers_meeting), max 5 per friday.
 */
export default function TeachersDashboard() {
  usePageTitle('أداء الخدام')
  const { classLabel } = useAuth()

  const dash = useTeachersDashboard()
  const {
    classes,
    view,
    setView,
    classId,
    setClassId,
    dateMode,
    setDateMode,
    topN,
    setTopN,
    trendN,
    setTrendN,
    showAll,
    data: d,
    loading,
    error,
    refetch,
    sum,
    totalChecks,
    attendPct,
    avg,
    late,
    needsFollow,
    absentMode,
    setAbsentMode,
    absentDate,
    absentServants,
    absentHasSession,
    absentLoading,
    absentError,
    absentRefetch,
    perfMetric,
    setPerfMetric,
    perfRank,
    setPerfRank,
    perfOrder,
    setPerfOrder,
    perfKey,
    perfLabel,
    perfServants,
    perfAllSorted,
  } = dash

  const channels = [
    {
      key: 'perf',
      label: 'أداء الخدام',
      icon: 'chart',
      count: d?.servants?.length,
    },
    {
      key: 'top',
      label: 'أفضل الخدام',
      icon: 'star',
      count: d?.top_servants?.length,
    },
    {
      key: 'absent',
      label: 'خدام غابوا',
      icon: 'servant',
      count: absentServants.length,
    },
    {
      key: 'late',
      label: 'متأخرون عن الاعتراف',
      icon: 'history',
      count: late?.late_count,
    },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">أداء الخدام</h1>
          <div className="page-head__sub">
            {d ? `${d.counts.teachers} خادم · ${totalChecks} متابعة` : 'مؤشرات المواظبة والافتقاد'}
          </div>
        </div>
      </div>

      <div className="dash-channels" role="tablist" aria-label="أقسام أداء الخدام">
        {channels.map((channel) => (
          <button
            key={channel.key}
            type="button"
            role="tab"
            aria-selected={view === channel.key}
            className={`dash-channel${view === channel.key ? ' is-active' : ''}`}
            onClick={() => setView(channel.key)}
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
        {view !== 'absent' && <DateModeField value={dateMode} onChange={setDateMode} />}
        <ToolbarSpacer />
        <span className="small muted">النقاط من 5 لكل جمعة</span>
      </Toolbar>

      <div className="dash-view">
        {view === 'absent' ? (
          <AbsentServantsList
            servants={absentServants}
            date={absentDate}
            mode={absentMode}
            onModeChange={setAbsentMode}
            hasSession={absentHasSession}
            loading={absentLoading}
            error={absentError}
            onRetry={absentRefetch}
            classLabel={classLabel}
            singleClass={d?.scope?.single_class ?? true}
          />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : loading && !d ? (
          <SkeletonRows rows={6} cols={5} />
        ) : d ? (
          view === 'perf' ? (
            <PerformanceView
              data={d}
              classLabel={classLabel}
              topN={topN}
              setTopN={setTopN}
              trendN={trendN}
              setTrendN={setTrendN}
              perfMetric={perfMetric}
              setPerfMetric={setPerfMetric}
              perfRank={perfRank}
              setPerfRank={setPerfRank}
              perfOrder={perfOrder}
              setPerfOrder={setPerfOrder}
              perfKey={perfKey}
              perfLabel={perfLabel}
              perfServants={perfServants}
              perfAllSorted={perfAllSorted}
              needsFollow={needsFollow}
              totalChecks={totalChecks}
              attendPct={attendPct}
              avg={avg}
              sum={sum}
            />
          ) : view === 'top' ? (
            <TopServantsView
              data={d}
              classLabel={classLabel}
              topN={topN}
              setTopN={setTopN}
            />
          ) : (
            <LateConfessionView data={d} late={late} />
          )
        ) : null}
      </div>
    </>
  )
}
