import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { DashboardAPI } from '../../lib/endpoints'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Table } from '../../components/ui/Table'
import { ScorePill } from '../../components/ui/Bits'
import { DashSection, Kpi, KpiRow, NField, TrendChart } from './parts'
import './dashboard.css'

/**
 * TeachersDashboard — "أداء الخدام".
 *
 * Score = true flags summed across checks (attend + prepare + liturgy + follow),
 * max 4 per friday. Ties with the Nth servant are included on purpose.
 */
export default function TeachersDashboard() {
  usePageTitle('أداء الخدام')
  const { user, classes, can, classLabel } = useAuth()

  const [classId, setClassId] = useState('')
  const [topN, setTopN] = useState(5)
  const [trendN, setTrendN] = useState(8)

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.summary({
        ...(classId ? { class_id: classId } : {}),
        top_n: topN,
        teacher_trend_n: trendN,
      }),
    [classId, topN, trendN],
  )

  const d = data
  const showAll = can.manageClasses(user) && classes.length > 1

  const totalChecks = (d?.servants || []).reduce((n, s) => n + s.checks, 0)
  const avg = d?.servants?.length
    ? (d.servants.reduce((n, s) => n + s.score, 0) / d.servants.length).toFixed(1)
    : '—'

  const columns = [
    { key: 'teacher_name', label: 'الخادم', mobile: 'الخادم', render: (s) => <span className="table__name">{s.teacher_name}</span> },
    { key: 'class_id', label: 'الفصل', width: 150, mobile: 'الفصل', render: (s) => classLabel(s.class_id) },
    { key: 'score', label: 'النقاط', width: 90, mobile: 'النقاط', render: (s) => <ScorePill value={s.score} suffix="" /> },
    { key: 'checks', label: 'متابعات', width: 90, align: 'center', mobile: 'متابعات' },
    { key: 'attend', label: 'حاضر', width: 70, align: 'center', mobile: 'حاضر' },
    { key: 'prepare', label: 'تحضير', width: 70, align: 'center', mobile: 'تحضير' },
    { key: 'liturgy', label: 'قداس', width: 70, align: 'center', mobile: 'قداس' },
    { key: 'follow', label: 'افتقاد', width: 70, align: 'center', mobile: 'افتقاد' },
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
        <ToolbarSpacer />
        <span className="small muted">النقاط من 4 لكل جمعة</span>
      </Toolbar>

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
              sub={`متابعة مسجلة ${totalChecks} • متوسط النقاط ${avg}`}
            />
            <Kpi value={totalChecks} label="متابعة" />
            <Kpi value={avg} label="متوسط النقاط" />
          </KpiRow>

          <DashSection
            title="منحنى حضور الخدام"
            hint="عدد الخدام الحاضرين في كل جمعة (من الأقدم للأحدث)."
            control={
              <NField label="عدد الجمع" value={trendN} onChange={setTrendN} from={1} to={12} />
            }
          >
            <div className="card">
              {d.teachers_trend.length ? (
                <TrendChart points={d.teachers_trend} />
              ) : (
                <p className="muted small">لا توجد متابعات مسجلة بعد.</p>
              )}
            </div>
          </DashSection>

          <DashSection
            title="أفضل الخدام"
            hint="النقاط = مجموع (الحضور + تحضير الدرس + القداس + الافتقاد) في كل المتابعات. المتساوتون مع الأخير يدخلون معه."
            control={<NField label="عدد الأوائل" value={topN} onChange={setTopN} from={1} to={12} />}
          >
            {d.top_servants.length === 0 ? (
              <EmptyState
                icon="servant"
                title="لا توجد متابعات بعد"
                message="سجّل متابعة الخدام أولًا لتظهر هنا."
                inline
              />
            ) : (
              <div className="name-list">
                {d.top_servants.map((s, i) => (
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

          {d.servants.length > 0 && (
            <DashSection
              title="أداء الخدام"
              hint="مجموع علامات ✓ التي جمعها كل خادم في كل المتابعات المسجلة."
            >
              <Table columns={columns} rows={d.servants} rowKey={(s) => s.teacher_id} compact stackOnMobile />
            </DashSection>
          )}
        </div>
      ) : null}
    </>
  )
}
