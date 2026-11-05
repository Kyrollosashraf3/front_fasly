import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '../../hooks'
import { DashboardAPI } from '../../lib/endpoints'
import { Progress } from '../../components/ui/Avatar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { boysWord, formatPercent, formatShort, todayISO } from '../../lib/format'
import { Kpi, KpiRow } from '../dashboard/parts'
import '../dashboard/dashboard.css'

/**
 * Whose numbers these are — the backend already picked the scope.
 *
 * "all" is every class for the church-wide amin, but only a stage amin's own
 * group when he is the one looking.
 */
const wordsFor = (isSuperAdmin) => ({
  scope: { group: 'مجموعتك', class: 'فصلك', all: isSuperAdmin ? 'كل الفصول' : 'فصولك' },
  coverage: {
    group: 'تغطية مجموعة الافتقاد',
    class: 'تغطية افتقاد الفصل',
    all: isSuperAdmin ? 'تغطية الافتقاد لكل الفصول' : 'تغطية الافتقاد لفصولك',
  },
})

/** Counts that read as Arabic, not as a number glued to a dual. */
const fridays = (n) => (n === 1 ? 'جمعة واحدة' : n === 2 ? 'جمعتين' : `${n} جمع`)
const reviews = (n) => (n === 1 ? 'متابعة واحدة' : n === 2 ? 'متابعتين' : `${n} متابعات`)

function Stat({ value, label, tone = '' }) {
  return (
    <div className={`week-stat${tone ? ` week-stat--${tone}` : ''}`}>
      <div className="week-stat__num">{value}</div>
      <div className="week-stat__label">{label}</div>
    </div>
  )
}

/** One season ratio: the name, the number, and the bar that proves it. */
function RateRow({ label, value, sub }) {
  return (
    <div className="rate">
      <div className="rate__head">
        <span className="rate__label">{label}</span>
        <span className="rate__num">{formatPercent(value)}</span>
      </div>
      <Progress value={value || 0} />
      {sub && <div className="rate__sub">{sub}</div>}
    </div>
  )
}

function SectionHead({ title, scopeWord, from }) {
  return (
    <div className="dash-head">
      <h2 className="dash-head__title">{title}</h2>
      <span className="dash-head__scope">{scopeWord}</span>
      <span className="dash-head__range">
        {formatShort(from)} — {formatShort(todayISO())}
      </span>
    </div>
  )
}

/**
 * HomeDashboard — the week and the season, for whoever is looking.
 *
 * One `GET /dashboard/my-performance` carries both windows: a servant reads
 * his own group and his own reviews, an amin reads his whole class, a stage amin
 * reads his group of classes and the church-wide amin reads every class. Nothing
 * is filtered here, so the screen can never disagree with the pages it is
 * measured on.
 */
export function HomeDashboard({ followUpHref }) {
  const { isSuperAdmin } = useAuth()
  const { data, loading, error, refetch } = useQuery(() => DashboardAPI.myPerformance(), [])

  const words = wordsFor(isSuperAdmin)
  const scope = data?.scope
  const week = data?.week
  const season = data?.season
  const scopeWord = words.scope[scope?.kind] || ''
  // A servant's season rows are ticks from his own review sheet; an amin's are
  // the attendance records of the class he watches.
  const ownSheet = Boolean(scope?.teacher_id)
  /** "٧ من ٧ جمع" out of his Friday sheet, before the first one an honest line. */
  const tickSub = (n) =>
    season?.checks ? `${n} من ${fridays(season.checks)}` : 'مفيش متابعات مسجلة'

  return (
    <section className="home-dash" aria-label="الأداء">
      {loading && !data ? (
        <SkeletonRows rows={3} cols={2} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="تعذّر تحميل الأداء" />
      ) : !scope ? null : !ownSheet ? (
        /* Amin General / Class Amin view — same design & calculation as Boys Performance */
        <div className="home-dash__amin">
          <div className="dash-head">
            <h2 className="dash-head__title">أداء الأولاد (من بداية السنة)</h2>
            <span className="dash-head__scope">{scopeWord}</span>
            <span className="dash-head__range">
              {formatShort(scope.season_from)} — {formatShort(todayISO())}
            </span>
          </div>

          <KpiRow>
            <Kpi
              hero
              value={`${season.attendance}%`}
              label="نسبة حضور الأولاد"
              progress={season.attendance}
              sub={`متوسط ${season.avg_present} من ${season.boys} ولد • غائب ${Math.max(0, season.boys - season.avg_present)}`}
            />
            <Kpi
              value={`${season.liturgy}%`}
              label="حضور القداس"
              sub={`متوسط ${season.avg_liturgy} من ${season.boys} ولد`}
            />
            <Kpi value={season.boys} label={`أولاد ${scopeWord}`} />
            <Kpi value={season.sessions} label="جمع مسجلة" />
          </KpiRow>

          <div className="dash-head" style={{ marginTop: 'var(--sp-4)' }}>
            <h2 className="dash-head__title">أداء الافتقاد</h2>
            <span className="dash-head__scope">{scopeWord}</span>
          </div>

          <KpiRow>
            <Kpi
              hero
              value={`${season.follow}%`}
              label="نسبة تغطية الافتقاد"
              progress={season.follow}
              sub={`${season.followed_boys} من ${season.boys} ولد تم افتقادهم`}
            />
            <Kpi
              value={season.follow_ups}
              label="عدد افتقادات مسجلة"
              sub="من بداية السنة الكنسية"
            />
            <Kpi
              value={season.followed_boys}
              label="أولاد تم افتقادهم"
              sub="على الأقل مرة واحدة"
            />
            <Kpi
              value={season.pending_boys}
              label="أولاد لم يتم افتقادهم"
              sub={season.pending_boys ? 'بحاجة إلى افتقاد' : 'تم افتقاد الكل'}
              numClassName={season.pending_boys ? 'kpi-num--warn' : ''}
            />
          </KpiRow>

          <div className="dash-head" style={{ marginTop: 'var(--sp-4)' }}>
            <h2 className="dash-head__title">الافتقاد آخر أسبوع</h2>
            <span className="dash-head__scope">{scopeWord}</span>
            <span className="dash-head__range">
              {formatShort(scope.week_from)} — {formatShort(todayISO())}
            </span>
          </div>

          <div className="home-dash__week-row">
            <div className="week-card">
              <div className="week-card__gauge">
                <span className="week-card__pct">{formatPercent(week.follow)}</span>
                <span className="week-card__caption">{words.coverage[scope.kind]}</span>
              </div>
              <div className="week-card__meter">
                <Progress value={week.follow} />
                <div className="week-card__foot">
                  <div className="week-card__hint">
                    {scope.boys ? (
                      `${week.followed_boys} من ${scope.boys} ${boysWord(
                        scope.boys,
                      )} اتافتقدوا الأسبوع ده`
                    ) : (
                      'لا يوجد أولاد'
                    )}
                  </div>
                  {scope.boys > 0 && (
                    <Link to={followUpHref} className="btn btn-accent btn-sm">
                      سجّل الافتقاد
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="week-stats">
              <Stat value={week.follow_ups} label="عدد افتقادات مسجلة" />
              <Stat
                value={week.followed_boys}
                label="أولاد تم افتقادهم (على الأقل مرة واحدة)"
                tone={week.followed_boys ? 'ok' : ''}
              />
              <Stat
                value={week.pending_boys}
                label="أولاد لم يتم افتقادهم"
                tone={week.pending_boys ? 'warn' : 'ok'}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Servant view */
        <div className="home-dash__grid">
          <div className="home-dash__col">
            <SectionHead title="آخر أسبوع" scopeWord={scopeWord} from={scope.week_from} />

            <div className="week-card">
              <div className="week-card__gauge">
                <span className="week-card__pct">{formatPercent(week.follow)}</span>
                <span className="week-card__caption">{words.coverage[scope.kind]}</span>
              </div>
              <div className="week-card__meter">
                <Progress value={week.follow} />
                <div className="week-card__foot">
                  <div className="week-card__hint">
                    {scope.boys ? (
                      `${week.followed_boys} من ${scope.boys} ${boysWord(
                        scope.boys,
                      )} اتافتقدوا الأسبوع ده`
                    ) : (
                      <>
                        لسه مفيش أولاد في مجموعتك.{' '}
                        <Link to="/groups" className="week-card__link">
                          رتّب المجموعات
                        </Link>
                      </>
                    )}
                  </div>
                  {scope.boys > 0 && (
                    <Link to={followUpHref} className="btn btn-accent btn-sm">
                      سجّل الافتقاد
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="week-stats">
              <Stat value={week.follow_ups} label="عدد افتقادات مسجلة" />
              <Stat
                value={week.followed_boys}
                label="أولاد تم افتقادهم (على الأقل مرة واحدة)"
                tone={week.followed_boys ? 'ok' : ''}
              />
              <Stat
                value={week.pending_boys}
                label="أولاد لم يتم افتقادهم"
                tone={week.pending_boys ? 'warn' : 'ok'}
              />
            </div>
          </div>

          <div className="home-dash__col">
            <SectionHead
              title="من بداية السنة"
              scopeWord={scopeWord}
              from={scope.season_from}
            />

            <div className="season-card">
              <RateRow
                label="نسبة الحضور"
                value={season.attendance}
                sub={tickSub(season.present)}
              />
              <RateRow
                label="نسبة حضور القداس"
                value={season.liturgy}
                sub={tickSub(season.liturgy_present)}
              />
              <RateRow
                label="نسبة التحضير"
                value={season.prepare}
                sub={tickSub(season.prepare_present)}
              />
              <RateRow
                label="نسبة اجتماع الخدام"
                value={season.teachers_meeting}
                sub={tickSub(season.meeting_present)}
              />
              <RateRow
                label="نسبة الافتقاد"
                value={season.follow}
                sub={tickSub(season.follow_present)}
              />

              <div className="season-card__count">
                <span>عدد تسجيلات الافتقاد</span>
                <strong>{season.follow_ups}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
