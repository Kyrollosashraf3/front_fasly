import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyProfileModal } from '../boys/BoyProfile'
import { DateModeField, Kpi, KpiRow } from './parts'
import { BoysSections } from './boys/BoysSections'
import { useBoysDashboard } from './boys/useBoysDashboard'
import './dashboard.css'

/**
 * BoysDashboard — "أداء الأولاد".
 *
 * One GET /dashboard/summary drives every card. The class picker, the period
 * and the three N-controls are query params, so changing one re-requests.
 * The class picker now drives the WHOLE page (totals included).
 */
export default function BoysDashboard() {
  usePageTitle('أداء الأولاد')
  const { classLabel } = useAuth()

  const dash = useBoysDashboard()
  const {
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">أداء الأولاد</h1>
          <div className="page-head__sub">
            {d
              ? `${d.counts.boys} ولد · ${d.counts.fridays} جمعة مسجلة`
              : 'مؤشرات الحضور والمواظبة'}
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
        <ToolbarSpacer />
        <span className="small muted">آخر جمعة مسجلة: {d?.last_friday?.date || '—'}</span>
      </Toolbar>

      {loading && !d ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <SkeletonRows rows={6} cols={4} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : d ? (
        <div className="dash">
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

          <BoysSections
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
            absentN={absentN}
            setAbsentN={setAbsentN}
            openBoy={openBoy}
            classLabel={classLabel}
          />
        </div>
      ) : null}

      <BoyProfileModal open={Boolean(boy)} boy={boy} onClose={closeBoy} />
    </>
  )
}
