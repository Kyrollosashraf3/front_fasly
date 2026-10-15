import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { DashboardAPI, TeacherAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { Select, SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer, Tabs } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Progress } from '../../components/ui/Avatar'
import { BoyName } from '../boys/BoyName'
import { BoyProfileModal, followLabel } from '../boys/BoyProfile'
import {
  DashSection,
  FollowedBadge,
  Kpi,
  KpiRow,
  TodoBadge,
  useBoyDrawer,
} from '../dashboard/parts'
import { formatShort } from '../../lib/format'
import '../dashboard/dashboard.css'
import './followup.css'

/** The period windows the module offers (mirrors the backend query pattern). */
const PERIOD_OPTIONS = [
  { value: 'week', label: 'آخر أسبوع' },
  { value: 'month', label: 'آخر شهر' },
  { value: 'season', label: 'من بداية السنة الكنسية' },
  { value: 'all', label: 'كل الفترة' },
]

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
  const { user, classes, can } = useAuth()

  const [classId, setClassId] = useState('')
  const [period, setPeriod] = useState('month')
  const [teacherId, setTeacherId] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('todo')
  const [expanded, setExpanded] = useState(null)
  const [boy, openBoy, closeBoy] = useBoyDrawer()

  const showServantFilter = can.seeTeachersDashboard(user)
  const showAll = can.manageClasses(user) && classes.length > 1

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.followUpPerformance({
        ...(classId ? { class_id: classId } : {}),
        period,
        ...(teacherId ? { teacher_id: teacherId } : {}),
      }),
    [classId, period, teacherId],
  )

  const { data: teachers } = useQuery(
    () => TeacherAPI.list({ ...(classId ? { class_id: classId } : {}) }),
    [classId],
    { enabled: showServantFilter },
  )

  const d = data
  const totals = d?.totals

  const ranking = useMemo(() => {
    const rows = d?.ranking || []
    const q = normalizeSearch(search)
    return rows.filter((r) => {
      if (tab === 'done' && !r.followed) return false
      if (tab === 'todo' && r.followed) return false
      if (q && !normalizeSearch(r.boy_name).includes(q)) return false
      return true
    })
  }, [d, tab, search])

  /* --------------------------------------------------------------- columns */
  const boyColumns = [
    {
      key: 'boy_name',
      label: 'الولد',
      mobile: 'الولد',
      sortValue: (r) => r.boy_name,
      render: (r) => (
        <span className="name-list__main">
          <BoyName
            boy={{ id: r.boy_id, boy_name: r.boy_name, class_id: r.class_id }}
            className="table__name"
            classId={r.class_id}
            onSaved={refetch}
          />
          {!d?.scope?.single_class && <span className="muted xsmall">{r.class_name}</span>}
        </span>
      ),
    },
    {
      key: 'servant_name',
      label: 'الخادم المسؤول',
      width: 150,
      mobile: 'الخادم المسؤول',
      sortValue: (r) => r.servant_name || '',
      render: (r) => r.servant_name || <span className="muted xsmall">بدون مجموعة</span>,
    },
    {
      key: 'count',
      label: 'عدد الافتقادات',
      width: 118,
      align: 'center',
      mobile: 'عدد الافتقادات',
      sortValue: (r) => r.count,
      render: (r) => (r.followed ? <FollowedBadge count={r.count} /> : <TodoBadge />),
    },
    {
      key: 'last_date',
      label: 'آخر افتقاد',
      width: 116,
      mobile: 'آخر افتقاد',
      sortValue: (r) => r.last_date || '',
      render: (r) => (r.last_date ? formatShort(r.last_date) : <span className="muted xsmall">—</span>),
    },
    {
      key: 'last_status',
      label: 'الطريقة',
      width: 116,
      mobile: 'الطريقة',
      render: (r) => (r.last_status ? <Badge kind="navy">{followLabel(r.last_status)}</Badge> : <span className="muted xsmall">—</span>),
    },
    {
      key: 'last_by_name',
      label: 'سجّله',
      width: 150,
      mobile: 'سجّله',
      render: (r) => r.last_by_name || <span className="muted xsmall">—</span>,
    },
    {
      key: 'details',
      label: '',
      width: 104,
      align: 'end',
      mobile: '',
      render: (r) =>
        r.count ? (
          <button
            type="button"
            className={`att-details${expanded === r.boy_id ? ' is-open' : ''}`}
            aria-expanded={expanded === r.boy_id}
            onClick={() => setExpanded(expanded === r.boy_id ? null : r.boy_id)}
          >
            السجل
          </button>
        ) : null,
    },
  ]

  const servantColumns = [
    {
      key: 'teacher_name',
      label: 'الخادم',
      mobile: 'الخادم',
      sortValue: (s) => s.teacher_name,
      render: (s) => <span className="table__name">{s.teacher_name}</span>,
    },
    ...(d?.scope?.single_class
      ? []
      : [
          {
            key: 'class_name',
            label: 'الفصل',
            width: 140,
            mobile: 'الفصل',
            sortValue: (s) => s.class_name || '',
            render: (s) => s.class_name || s.class_id,
          },
        ]),
    {
      key: 'group_size',
      label: 'المجموعة',
      width: 92,
      align: 'center',
      mobile: 'المجموعة',
      sortValue: (s) => s.group_size,
    },
    {
      key: 'percent',
      label: 'تغطية المجموعة',
      width: 180,
      mobile: 'تغطية المجموعة',
      sortValue: (s) => s.percent,
      render: (s) =>
        s.group_size ? (
          <Progress value={s.percent} label={`${s.percent}%`} />
        ) : (
          <span className="muted xsmall">بدون أولاد</span>
        ),
    },
    {
      key: 'logged',
      label: 'افتقادات سجلها',
      width: 120,
      align: 'center',
      mobile: 'افتقادات سجلها',
      sortValue: (s) => s.logged,
      render: (s) => s.logged || <span className="muted xsmall">0</span>,
    },
    {
      key: 'last',
      label: 'آخر افتقاد',
      width: 116,
      mobile: 'آخر افتقاد',
      sortValue: (s) => s.last || '',
      render: (s) => (s.last ? formatShort(s.last) : <span className="muted xsmall">—</span>),
    },
    {
      key: 'active',
      label: 'الحالة',
      width: 106,
      mobile: 'الحالة',
      render: (s) => (s.active ? <Badge kind="green">افتقد</Badge> : <Badge kind="red">لم يفتقد</Badge>),
    },
  ]

  /** Expanded row: the boy's recent follow-ups, newest first. */
  const historyPanel = (row) => (
    <div className="fu-history">
      <ul className="fu-history__list">
        {row.history.map((h, i) => (
          <li key={`${h.date}-${i}`}>
            <span className="fu-history__date">{formatShort(h.date)}</span>
            <Badge kind="navy">{followLabel(h.status)}</Badge>
            <span className="muted small">{h.teacher_name}</span>
            {h.note && <span className="fu-history__note">{h.note}</span>}
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" onClick={() => openBoy(row)}>
        عرض الملف
      </Button>
    </div>
  )

  const fromLabel = d?.scope?.period_from ? formatShort(d.scope.period_from) : 'البداية'

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">أداء الافتقاد</h1>
          <div className="page-head__sub">
            {d ? `نسبة الافتقاد من ${fromLabel}` : 'نسب الافتقاد وأداء الخدام'}
          </div>
        </div>
      </div>

      <Toolbar>
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

        {showServantFilter && (
          <label className="n-field">
            الخادم
            <Select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="select--plain"
              style={{ minWidth: 180 }}
              aria-label="اختيار الخادم"
            >
              <option value="">كل الخدام</option>
              {(teachers || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacher_name}
                </option>
              ))}
            </Select>
          </label>
        )}

        <SearchInput value={search} onChange={setSearch} placeholder="ابحث باسم الولد..." />
        <ToolbarSpacer />
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
              value={`${totals.percent}%`}
              label="نسبة الافتقاد"
              progress={totals.percent}
              sub={`اتفتقد ${totals.followed} • لم يُفتقد ${totals.not_followed} • الكل ${totals.boys}`}
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

          {!d.scope.single_class && d.by_class.length > 0 && (
            <DashSection title="نسبة الافتقاد لكل فصل">
              <div className="card class-bars">
                {[...d.by_class]
                  .sort((a, b) => b.percent - a.percent)
                  .map((c) => (
                    <div key={c.class_id}>
                      <div className="class-bars__row">
                        <strong>{c.class_name || c.class_id}</strong>
                        <span className="muted small">
                          {c.followed}/{c.boys} • {c.percent}%
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

          {d.servants.length > 0 && (
            <DashSection
              title="أداء الخدام"
              hint="تغطية المجموعة = عدد أولاد مجموعة الخادم الذين تم افتقادهم ÷ حجم مجموعته، وبجانبها عدد الافتقادات التي سجّلها بنفسه."
            >
              <Table
                columns={servantColumns}
                rows={d.servants}
                rowKey={(s) => s.teacher_id}
                sortable
                stackOnMobile
                compact
              />
            </DashSection>
          )}

          <DashSection
            title="ترتيب الأولاد"
            hint={`${ranking.length} ولد — افتقادات الفترة من ${fromLabel}.`}
            control={
              <Tabs
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'todo', label: 'لم يُفتقدوا', count: totals.not_followed },
                  { value: 'done', label: 'اتفتقدوا', count: totals.followed },
                  { value: 'all', label: 'الكل', count: totals.boys },
                ]}
              />
            }
          >
            {ranking.length === 0 ? (
              <EmptyState
                icon="heart"
                title={tab === 'todo' ? 'لا يوجد متبقون' : 'لا توجد نتائج'}
                message={
                  tab === 'todo'
                    ? 'كل الأولاد تم افتقادهم خلال الفترة المختارة.'
                    : 'جرّب تغيير الفلتر أو الفترة.'
                }
                inline
              />
            ) : (
              <Table
                columns={boyColumns}
                rows={ranking}
                rowKey={(r) => r.boy_id}
                rowClassName={(r) => (r.followed ? 'is-followed' : '')}
                renderExpanded={(r) => (expanded === r.boy_id ? historyPanel(r) : null)}
                sortable
                stackOnMobile
                compact
              />
            )}
          </DashSection>
        </div>
      ) : null}

      <BoyProfileModal open={Boolean(boy)} boy={boy} onClose={closeBoy} />
    </>
  )
}
