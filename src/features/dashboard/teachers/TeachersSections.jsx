import { Tabs } from '../../../components/ui/Toolbar'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { EmptyState } from '../../../components/ui/States'
import { ScorePill } from '../../../components/ui/Bits'
import { DashboardAPI } from '../../../lib/endpoints'
import { formatShort } from '../../../lib/format'
import {
  DashSection,
  Kpi,
  KpiRow,
  LateBadge,
  NField,
  PerformanceCurve,
  ServantGroups,
  TrendChart,
} from '../parts'
import { NeedsFollowList } from './NeedsFollowList'
import { PERF_METRICS } from './useTeachersDashboard'

const RANK_OPTIONS = [
  { value: 'best', label: 'أفضل الخدام' },
  { value: 'worst', label: 'أضعف الخدام' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'تنازلي' },
  { value: 'asc', label: 'تصاعدي' },
]

/** The servants table shared by every view that needs the raw numbers. */
function ServantsTable({ rows, classLabel }) {
  if (!rows.length) {
    return (
      <EmptyState
        icon="servant"
        title="لا توجد متابعات في الفترة"
        message="مفيش متابعة خدام في الفترة المختارة. غيّر الفترة أو سجّل متابعة الأول."
        inline
      />
    )
  }

  /* The same table on a phone as on the desktop: every column, every
     click-to-sort header. `servants-table` pins the name column while the
     numbers scroll sideways (features/dashboard/css/responsive.css). */
  const columns = [
    {
      key: 'teacher_name',
      label: 'الخادم',
      sortValue: (s) => s.teacher_name,
      render: (s) => <span className="table__name">{s.teacher_name}</span>,
    },
    {
      key: 'class_id',
      label: 'الفصل',
      width: 150,
      sortValue: (s) => classLabel(s.class_id),
      render: (s) => classLabel(s.class_id),
    },
    {
      key: 'score',
      label: 'النقاط',
      width: 90,
      sortValue: (s) => s.score,
      render: (s) => <ScorePill value={s.score} suffix="" />,
    },
    {
      key: 'attend',
      label: 'حاضر',
      width: 70,
      align: 'center',
      sortValue: (s) => s.attend,
    },
    {
      key: 'prepare',
      label: 'تحضير الدرس',
      width: 90,
      align: 'center',
      sortValue: (s) => s.prepare,
    },
    {
      key: 'liturgy',
      label: 'القداس',
      width: 70,
      align: 'center',
      sortValue: (s) => s.liturgy,
    },
    {
      key: 'follow',
      label: 'افتقاد',
      width: 70,
      align: 'center',
      sortValue: (s) => s.follow,
    },
    {
      key: 'teachers_meeting',
      label: 'اجتماع الخدام',
      width: 100,
      align: 'center',
      sortValue: (s) => s.teachers_meeting,
    },
  ]

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(s) => s.teacher_id}
      className="servants-table"
      compact
      sortable
    />
  )
}

/**
 * PerformanceView — the «أداء الخدام» curve plus its filters.
 *
 * The curve plots one metric across the best (or worst) servants; the metric,
 * the subset and the order are all filters, so the same chart answers "who is
 * best at attendance?", "who is weakest at follow-up?" and so on.
 */
export function PerformanceView({
  data,
  classLabel,
  topN,
  setTopN,
  trendN,
  setTrendN,
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
  needsFollow,
  totalChecks,
  attendPct,
  avg,
  sum,
}) {
  const values = perfServants.map((s) => Number(s[perfKey] ?? 0))
  const maxValue = values.length ? Math.max(...values) : 0
  const minValue = values.length ? Math.min(...values) : 0
  const avgValue = values.length
    ? (values.reduce((n, v) => n + v, 0) / values.length).toFixed(1)
    : '—'

  // The sheet is the table as it stands: same period, same metric and order.
  const exportParams = {
    date_mode: data.scope.date_mode,
    metric: perfMetric,
    order: perfOrder,
    ...(data.scope.single_class
      ? { class_id: data.scope.classes[0] }
      : { class_ids: data.scope.classes.join(',') }),
  }

  return (
    <>
      <KpiRow>
        <Kpi
          hero
          value={data.servants.length}
          label="خدام تمت متابعتهم"
          sub={`متابعة مسجلة ${totalChecks} • متوسط النقاط ${avg} من 5`}
        />
        <Kpi value={`${attendPct}%`} label="حضور الخدام" />
        <Kpi value={sum('teachers_meeting')} label="اجتماع الخدام" sub="مرات الحضور" />
        <Kpi value={avg} label="متوسط النقاط" sub="من 5" />
      </KpiRow>

      <DashSection
        title="منحنى أداء الخدام"
        hint={`${perfLabel} — ${perfRank === 'best' ? 'أفضل' : 'أضعف'} ${perfServants.length} خادم، مرتبين ${perfOrder === 'asc' ? 'تصاعديًا' : 'تنازليًا'}. أعلى قيمة ${maxValue} · أقل قيمة ${minValue} · المتوسط ${avgValue}.`}
      >
        <div className="dash-filters">
          <Tabs value={perfRank} onChange={setPerfRank} options={RANK_OPTIONS} />
          <Tabs value={perfOrder} onChange={setPerfOrder} options={ORDER_OPTIONS} />
          <NField label="عدد الخدام" value={topN} onChange={setTopN} from={3} to={12} />
        </div>

        <div className="dash-filters dash-filters--metrics">
          <span className="dash-filters__label">المقياس</span>
          <Tabs value={perfMetric} onChange={setPerfMetric} options={PERF_METRICS} />
        </div>

        <div className="card">
          {perfServants.length ? (
            <PerformanceCurve
              items={perfServants}
              metricKey={perfKey}
              metricLabel={perfLabel}
            />
          ) : (
            <EmptyState
              icon="chart"
              title="لا توجد متابعات في الفترة"
              message="مفيش متابعة خدام في الفترة المختارة. غيّر الفترة من فوق أو سجّل متابعة الأول."
              inline
            />
          )}
        </div>
      </DashSection>

      <DashSection
        title="تطور الحضور على الجمع"
        hint="عدد الخدام الحاضرين في كل جمعة (من الأقدم للأحدث)."
        control={
          <NField label="عدد الجمع" value={trendN} onChange={setTrendN} from={1} to={12} />
        }
      >
        <div className="card">
          {data.teachers_trend.length ? (
            <TrendChart points={data.teachers_trend} unit="حاضر" />
          ) : (
            <p className="muted small">لا توجد متابعات في الفترة المختارة.</p>
          )}
        </div>
      </DashSection>

      <NeedsFollowList servants={needsFollow} classLabel={classLabel} />

      <DashSection
        title="تفاصيل الخدام"
        hint="كل الخدام اللي عليهم متابعة في الفترة، بالأرقام، مرتبين حسب المقياس والترتيب المختارين فوق."
        control={
          perfAllSorted.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Icon name="download" size={15} />}
              onClick={() => DashboardAPI.exportTeachers(exportParams)}
            >
              تصدير الإكسل
            </Button>
          )
        }
      >
        <ServantsTable rows={perfAllSorted} classLabel={classLabel} />
      </DashSection>
    </>
  )
}

/** TopServantsView — the ranking list ordered by total score. */
export function TopServantsView({ data, classLabel, topN, setTopN }) {
  return (
    <DashSection
      title="ترتيب أفضل الخدام"
      hint="النقاط = مجموع (الحضور + تحضير الدرس + القداس + الافتقاد + اجتماع الخدام) في كل المتابعات. المتساوون مع الأخير يدخلون معه."
      control={
        <NField label="عدد الأوائل" value={topN} onChange={setTopN} from={1} to={12} />
      }
    >
      {data.top_servants.length === 0 ? (
        <EmptyState
          icon="servant"
          title="لا توجد متابعات بعد"
          message="سجّل متابعة الخدام أولًا لتظهر هنا."
          inline
        />
      ) : (
        <div className="name-list">
          {data.top_servants.map((s, i) => (
            <div className="name-list__item" key={s.teacher_id}>
              <span className="name-list__main">
                <span className={`dash-rank dash-rank--${Math.min(i + 1, 3)}`}>{i + 1}</span>
                <strong>{s.teacher_name}</strong>
                <span className="muted small">• {classLabel(s.class_id)}</span>
              </span>
              <span className="score-pill">{s.score} نقطة</span>
            </div>
          ))}
        </div>
      )}
    </DashSection>
  )
}

/** LateConfessionView — servants who have not confessed in the period. */
export function LateConfessionView({ data, late }) {
  return (
    <DashSection
      title="قائمة المتأخرين عن الاعتراف"
      hint={
        late?.late_count
          ? `${late.late_count} خادم لم يعترفوا من ${formatShort(data.scope.period_start)}.`
          : 'الكل اعترفوا خلال الفترة المختارة.'
      }
    >
      <ServantGroups
        groups={late?.late || {}}
        singleClass={data.scope.single_class}
        emptyTitle="لا يوجد متأخرون"
        emptyMsg="كل الخدام اعترفوا خلال الفترة المختارة."
        badge={(s) => <LateBadge days={s.days} />}
      />
    </DashSection>
  )
}
