import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { DateModeField, Kpi, KpiRow } from './parts'
import { AbsentServantsList } from './teachers/AbsentServantsList'
import { NeedsFollowList } from './teachers/NeedsFollowList'
import { TeachersSections } from './teachers/TeachersSections'
import { useTeachersDashboard } from './teachers/useTeachersDashboard'
import './dashboard.css'

/**
 * TeachersDashboard — "أداء الخدام".
 *
 * Score = true flags summed across checks
 * (attend + prepare + liturgy + follow + teachers_meeting), max 5 per friday.
 * Ties with the Nth servant are included on purpose.
 */
export default function TeachersDashboard() {
  usePageTitle('أداء الخدام')
  const { classLabel } = useAuth()

  const dash = useTeachersDashboard()
  const {
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
    absentHasSession,
    absentLoading,
    absentError,
    absentRefetch,
  } = dash

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

      <Toolbar>
        {classes.length > 1 && (
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="select--plain"
            style={{ minWidth: 190 }}
            aria-label="اختيار الفصل"
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
        <ToolbarSpacer />
        <span className="small muted">النقاط من 5 لكل جمعة</span>
      </Toolbar>

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

      <NeedsFollowList servants={needsFollow} classLabel={classLabel} />

      {loading && !d ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <SkeletonRows rows={6} cols={5} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : d ? (
        <div className="dash">
          <KpiRow>
            <Kpi
              hero
              value={d.counts.teachers}
              label="خدام تمت متابعتهم"
              sub={`متابعة مسجلة ${totalChecks} • متوسط النقاط ${avg} من 5`}
            />
            <Kpi value={`${attendPct}%`} label="حضور الخدام" />
            <Kpi value={sum('teachers_meeting')} label="اجتماع الخدام" sub="مرات الحضور" />
            <Kpi value={avg} label="متوسط النقاط" sub="من 5" />
          </KpiRow>

          <TeachersSections
            data={d}
            cover={cover}
            late={late}
            coverGroups={coverGroups}
            coverTab={coverTab}
            setCoverTab={setCoverTab}
            trendN={trendN}
            setTrendN={setTrendN}
            topN={topN}
            setTopN={setTopN}
            classLabel={classLabel}
          />
        </div>
      ) : null}
    </>
  )
}
