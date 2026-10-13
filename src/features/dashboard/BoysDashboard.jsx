import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { DashboardAPI } from '../../lib/endpoints'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer, Tabs } from '../../components/ui/Toolbar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { BoyProfileModal } from '../boys/BoyProfile'
import {
  AbsentNowBadge,
  ClassGroups,
  DashSection,
  FollowedBadge,
  Kpi,
  KpiRow,
  LateBadge,
  NField,
  PeriodField,
  StreakBadge,
  TodoBadge,
  TrendChart,
  useBoyDrawer,
} from './parts'
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
  const { user, classes, can, classLabel } = useAuth()

  const [classId, setClassId] = useState('')
  const [periodDays, setPeriodDays] = useState(30)
  const [streakN, setStreakN] = useState(4)
  const [absentN, setAbsentN] = useState(4)
  const [trendN, setTrendN] = useState(8)
  const [coverTab, setCoverTab] = useState('todo')
  const [boy, openBoy, closeBoy] = useBoyDrawer()

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.summary({
        ...(classId ? { class_id: classId } : {}),
        period_days: periodDays,
        streak_n: streakN,
        absent_n: absentN,
        trend_n: trendN,
      }),
    [classId, periodDays, streakN, absentN, trendN],
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
          >
            {showAll && <option value="">كل الفصول</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <PeriodField value={periodDays} onChange={setPeriodDays} />
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

          {!d.scope.single_class && byClass.length > 0 && (
            <DashSection title="نسبة الحضور لكل فصل">
              <div className="card class-bars">
                {byClass.map(([cid, v]) => (
                  <div key={cid}>
                    <div className="class-bars__row">
                      <strong>{classLabel(Number(cid))}</strong>
                      <span>
                        {v.percent}% حضور · {v.liturgy_percent}% قداس ({v.present}/{v.total})
                      </span>
                    </div>
                    <div className="progress">
                      <div className="progress__fill" style={{ width: `${v.percent}%` }} />
                    </div>
                    <div className="progress progress--liturgy">
                      <div className="progress__fill" style={{ width: `${v.liturgy_percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DashSection>
          )}

          <DashSection
            title="منحنى حضور الأولاد"
            hint="عدد الحاضرين وحضور القداس في كل جمعة (من الأقدم للأحدث)."
            control={
              <NField label="عدد الجمع" value={trendN} onChange={setTrendN} from={1} to={12} />
            }
          >
            <div className="card">
              {d.boys_trend.length ? (
                <TrendChart points={d.boys_trend} />
              ) : (
                <p className="muted small">لا توجد جمعات مسجلة بعد.</p>
              )}
            </div>
          </DashSection>

          <DashSection
            title="افتقاد الأولاد"
            hint={`الأولاد الذين تم افتقادهم خلال الفترة مقابل من لم يُفتقد بعد (${d.scope.period_days} يوم).`}
            control={
              <Tabs
                value={coverTab}
                onChange={setCoverTab}
                options={[
                  { value: 'todo', label: 'لم يُفتقدوا', count: cover?.todo_count },
                  { value: 'done', label: 'اتفتقدوا', count: cover?.done_count },
                ]}
              />
            }
          >
            <ClassGroups
              groups={coverGroups || {}}
              singleClass={d.scope.single_class}
              emptyTitle={coverTab === 'done' ? 'لا يوجد افتقاد' : 'تم افتقاد الكل'}
              emptyMsg={
                coverTab === 'done'
                  ? 'لم يتم افتقاد أي ولد خلال الفترة المختارة.'
                  : 'كل الأولاد تم افتقادهم خلال الفترة.'
              }
              badge={(b) =>
                coverTab === 'done' ? <FollowedBadge count={b.count} /> : <TodoBadge />
              }
              onBoy={openBoy}
            />
          </DashSection>

          <DashSection
            title="متأخرون عن الاعتراف"
            hint={
              late?.late_count
                ? `${late.late_count} ولد لم يعترفوا خلال ${d.scope.period_days} يوم.`
                : 'الكل اعترفوا خلال الفترة المختارة.'
            }
          >
            <ClassGroups
              groups={late?.late || {}}
              singleClass={d.scope.single_class}
              emptyTitle="لا يوجد متأخرون"
              emptyMsg="كل الأولاد اعترفوا خلال الفترة المختارة."
              badge={(b) => <LateBadge days={b.days} />}
              onBoy={openBoy}
            />
          </DashSection>

          <DashSection
            title="المواظبون على الحضور"
            hint={`حاضرون جمعات متواصلة حتى آخر جمعة مسجلة (${d.last_friday.date ? d.last_friday.date : '—'}).`}
            control={
              <NField
                label="عدد الجمع المتواصلة"
                value={streakN}
                onChange={setStreakN}
                from={1}
                to={12}
              />
            }
          >
            <ClassGroups
              groups={d.streaks}
              singleClass={d.scope.single_class}
              emptyTitle="لا يوجد مواظبون"
              emptyMsg={`لا أحد وصل ${streakN} جمعات متواصلة. جرّب رقمًا أصغر.`}
              badge={(b) => <StreakBadge streak={b.streak} />}
              onBoy={openBoy}
            />
          </DashSection>

          <DashSection
            title="غياب آخر جمعة مسجلة"
            hint={
              d.last_friday.date
                ? `${d.last_friday.date} — حاضر ${d.last_friday.present_count} • غائب ${d.last_friday.absent_count}`
                : 'لم يتم تسجيل أي حضور حتى الآن.'
            }
          >
            {d.last_friday.date ? (
              <ClassGroups
                groups={d.last_friday.by_class}
                singleClass={d.scope.single_class}
                emptyTitle="لا يوجد غياب"
                emptyMsg="الكل كان حاضرًا في آخر جمعة مسجلة."
                badge={() => <AbsentNowBadge />}
                onBoy={openBoy}
              />
            ) : (
              <p className="muted small">لا يوجد تسجيل بعد.</p>
            )}
          </DashSection>

          <DashSection
            title="الغياب المتكرر"
            hint="الأولاد الذين غابوا أكثر من العدد المحدد من الجمع."
            control={
              <NField
                label="أكثر من كام جمعة غياب"
                value={absentN}
                onChange={setAbsentN}
                from={0}
                to={12}
              />
            }
          >
            <ClassGroups
              groups={d.frequent_absent}
              singleClass={d.scope.single_class}
              emptyTitle="لا يوجد غياب متكرر"
              emptyMsg={`لا أحد غاب أكثر من ${absentN} جمعات.`}
              badge={(b) => <Badge kind="red">غياب {b.absent_count}</Badge>}
              onBoy={openBoy}
            />
          </DashSection>
        </div>
      ) : null}

      <BoyProfileModal open={Boolean(boy)} boy={boy} onClose={closeBoy} />
    </>
  )
}
