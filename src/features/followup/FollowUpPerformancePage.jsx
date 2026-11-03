import { usePageTitle } from '../../context/TitleContext'
import { Select, SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { BoyProfileModal } from '../boys/BoyProfile'
import { DashSection, Kpi, KpiRow, useBoyDrawer } from '../dashboard/parts'
import { PERIOD_OPTIONS } from './performance/constants'
import { boyColumns } from './performance/columns'
import { ServantsSection } from './performance/ServantsSection'
import { BoysRankingSection } from './performance/BoysRankingSection'
import { HistoryModal } from './performance/HistoryModal'
import { usePerformance } from './performance/usePerformance'
import '../dashboard/dashboard.css'
import './followup.css'

/**
 * FollowUpPerformancePage — "أداء الافتقاد".
 *
 * One GET /dashboard/follow-up drives every card. The class picker, the period
 * and the servant filter are query params, so changing one re-requests. It
 * answers: what share of the boys were reached, which boys are still pending,
 * how is each servant doing, and a ranked boy list with a glimpse of history.
 */
export default function FollowUpPerformancePage() {
  usePageTitle('أداء الافتقاد')

  const perf = usePerformance()
  const {
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
    showAll,
    data,
    totals,
    teachers,
    loading,
    error,
    refetch,
    ranking,
    servantRows,
    fromLabel,
  } = perf

  const [boy, openBoy, closeBoy] = useBoyDrawer()

  const columns = boyColumns({
    data,
    refetch,
    expanded,
    setExpanded,
    setHistoryBoy,
  })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head__sub">
            {data ? `نسبة الافتقاد من ${fromLabel}` : 'نسب الافتقاد وأداء الخدام'}
          </div>
        </div>
      </div>

      <Toolbar className="toolbar--scroll">
        {classes.length > 1 && (
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value)
              setTeacherId('')
            }}
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

        <label className="n-field">
          الفترة
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 178 }}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="n-field">
          الخادم
          <Select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="select--plain"
            style={{ minWidth: 180 }}
            aria-label="اختيار الخادم"
            searchable
            searchPlaceholder="ابحث باسم الخادم..."
          >
            <option value="">كل الخدام</option>
            {(teachers || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.teacher_name}
              </option>
            ))}
          </Select>
        </label>

        <SearchInput value={search} onChange={setSearch} placeholder="ابحث باسم الولد..." />
        <Button
          variant={showUnvisitedOnly ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setShowUnvisitedOnly((v) => !v)}
          style={{ marginInlineStart: 8 }}
        >
          لم يُفتقدوا بعد
        </Button>
        <ToolbarSpacer />
      </Toolbar>

      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث باسم الولد..." />

      {loading && !data ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <SkeletonRows rows={6} cols={4} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data ? (
        <div className="dash">
          <KpiRow>
            <Kpi
              hero
              value={`${Math.round(totals.percent)}%`}
              numClassName="kpi-num--percent"
              label="نسبة الافتقاد"
              progress={totals.percent}
              sub={`افتقد ${totals.followed} • لم يُفتقد ${totals.not_followed} • الكل ${totals.boys}`}
            />
            <Kpi
              value={totals.followups}
              label="افتقادات مسجلة"
              sub={totals.boys ? `متوسط ${totals.avg} لكل ولد` : 'لا يوجد أولاد'}
            />
            <Kpi
              value={`${totals.servants_active}/${totals.servants}`}
              label="خدام افتقدوا"
              sub={`${totals.servants_inactive} لم يفتقدوا بعد`}
            />
            <Kpi
              value={totals.not_followed}
              label="أولاد لم يُفتقدوا"
              sub={totals.not_followed ? 'بحاجة إلى متابعة' : 'كل الأولاد تم افتقادهم'}
            />
          </KpiRow>

          {!data.scope.single_class && data.by_class.length > 0 && (
            <DashSection title="نسبة الافتقاد لكل فصل">
              <div className="card class-bars">
                {[...data.by_class]
                  .sort((a, b) => b.percent - a.percent)
                  .map((c) => (
                    <div key={c.class_id}>
                      <div className="class-bars__row">
                        <strong>{c.class_name || c.class_id}</strong>
                        <span className="muted small">
                          {c.followed}/{c.boys} • {Math.round(c.percent)}%
                        </span>
                      </div>
                      <div className="progress">
                        <div className="progress__fill" style={{ width: `${c.percent}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </DashSection>
          )}

          <ServantsSection
            data={data}
            servantRows={servantRows}
            servantSearch={servantSearch}
            setServantSearch={setServantSearch}
          />

          <BoysRankingSection
            totals={totals}
            tab={tab}
            setTab={setTab}
            ranking={ranking}
            fromLabel={fromLabel}
            columns={columns}
            expanded={expanded}
            onOpenBoy={openBoy}
          />
        </div>
      ) : null}

      <BoyProfileModal open={Boolean(boy)} boy={boy} onClose={closeBoy} />

      <HistoryModal boy={historyBoy} onClose={() => setHistoryBoy(null)} />
    </>
  )
}
