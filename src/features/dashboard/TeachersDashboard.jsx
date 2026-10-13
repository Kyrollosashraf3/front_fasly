import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { DashboardAPI } from '../../lib/endpoints'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer, Tabs } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Table } from '../../components/ui/Table'
import { ScorePill } from '../../components/ui/Bits'
import {
  DashSection,
  DateModeField,
  FollowedBadge,
  Kpi,
  KpiRow,
  LateBadge,
  NField,
  ServantGroups,
  TodoBadge,
  TrendChart,
} from './parts'
import { formatShort } from '../../lib/format'
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
  const { user, classes, can, classLabel } = useAuth()

  const [classId, setClassId] = useState('')
  const [dateMode, setDateMode] = useState('last_friday')
  const [topN, setTopN] = useState(5)
  const [trendN, setTrendN] = useState(8)
  const [coverTab, setCoverTab] = useState('todo')

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.summary({
        ...(classId ? { class_id: classId } : {}),
        date_mode: dateMode,
        top_n: topN,
        teacher_trend_n: trendN,
      }),
    [classId, dateMode, topN, trendN],
  )

  const d = data
  const showAll = can.manageClasses(user) && classes.length > 1

  const sum = (key) => (d?.servants || []).reduce((n, s) => n + s[key], 0)
  const totalChecks = sum('checks')
  const attendPct = totalChecks ? Math.round((sum('attend') / totalChecks) * 100) : 0
  const avg = d?.servants?.length
    ? (sum('score') / d.servants.length).toFixed(1)
    : '—'

  const cover = d?.follow?.servants
  const late = d?.confession?.servants
  const coverGroups = coverTab === 'done' ? cover?.done : cover?.todo

  const columns = [
    { key: 'teacher_name', label: 'الخادم', mobile: 'الخادم', render: (s) => <span className="table__name">{s.teacher_name}</span> },
    { key: 'class_id', label: 'الفصل', width: 150, mobile: 'الفصل', render: (s) => classLabel(s.class_id) },
    { key: 'score', label: 'النقاط', width: 90, mobile: 'النقاط', render: (s) => <ScorePill value={s.score} suffix="" /> },
    { key: 'attend', label: 'حاضر', width: 70, align: 'center', mobile: 'حاضر' },
    { key: 'prepare', label: 'تحضير الدرس', width: 90, align: 'center', mobile: 'تحضير الدرس' },
    { key: 'liturgy', label: 'القداس', width: 70, align: 'center', mobile: 'القداس' },
    { key: 'follow', label: 'افتقاد', width: 70, align: 'center', mobile: 'افتقاد' },
    { key: 'teachers_meeting', label: 'اجتماع الخدام', width: 100, align: 'center', mobile: 'اجتماع الخدام' },
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
        <DateModeField value={dateMode} onChange={setDateMode} />
        <ToolbarSpacer />
        <span className="small muted">النقاط من 5 لكل جمعة</span>
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
              sub={`متابعة مسجلة ${totalChecks} • متوسط النقاط ${avg} من 5`}
            />
            <Kpi value={`${attendPct}%`} label="حضور الخدام" />
            <Kpi value={sum('teachers_meeting')} label="اجتماع الخدام" sub="مرات الحضور" />
            <Kpi value={avg} label="متوسط النقاط" sub="من 5" />
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
                <TrendChart points={d.teachers_trend} unit="حاضر" />
              ) : (
                <p className="muted small">لا توجد متابعات مسجلة بعد.</p>
              )}
            </div>
          </DashSection>

          <DashSection
            title="أفضل الخدام"
            hint="النقاط = مجموع (الحضور + تحضير الدرس + القداس + الافتقاد + اجتماع الخدام) في كل المتابعات. المتساوتون مع الأخير يدخلون معه."
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

          <DashSection
            title="افتقاد الخدام"
            hint={`الخدام الذين سجّلوا افتقادًا خلال الفترة مقابل من لم يسجّل بعد (من ${formatShort(d.scope.period_start)}).`}
            control={
              <Tabs
                value={coverTab}
                onChange={setCoverTab}
                options={[
                  { value: 'todo', label: 'لم يفتقدوا', count: cover?.todo_count },
                  { value: 'done', label: 'افتقدوا', count: cover?.done_count },
                ]}
              />
            }
          >
            <ServantGroups
              groups={coverGroups || {}}
              singleClass={d.scope.single_class}
              emptyTitle={coverTab === 'done' ? 'لا يوجد افتقاد' : 'افتقد الكل'}
              emptyMsg={
                coverTab === 'done'
                  ? 'لم يسجّل أي خادم افتقادًا خلال الفترة.'
                  : 'كل الخدام سجّلوا افتقادًا خلال الفترة.'
              }
              badge={(s) =>
                coverTab === 'done' ? <FollowedBadge count={s.count} /> : <TodoBadge />
              }
            />
          </DashSection>

          <DashSection
            title="متأخرون عن الاعتراف"
            hint={
              late?.late_count
                ? `${late.late_count} خادم لم يعترفوا من ${formatShort(d.scope.period_start)}.`
                : 'الكل اعترفوا خلال الفترة المختارة.'
            }
          >
            <ServantGroups
              groups={late?.late || {}}
              singleClass={d.scope.single_class}
              emptyTitle="لا يوجد متأخرون"
              emptyMsg="كل الخدام اعترفوا خلال الفترة المختارة."
              badge={(s) => <LateBadge days={s.days} />}
            />
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
