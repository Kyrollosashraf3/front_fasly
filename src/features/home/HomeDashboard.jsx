import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '../../hooks'
import { DashboardAPI } from '../../lib/endpoints'
import { Progress } from '../../components/ui/Avatar'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { boysWord, formatPercent, formatShort, todayISO } from '../../lib/format'

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

  return (
    <section className="home-dash" aria-label="الأداء">
      {loading && !data ? (
        <SkeletonRows rows={3} cols={2} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="تعذّر تحميل الأداء" />
      ) : !scope ? null : (
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
              <Stat
                value={week.pending_boys}
                label="لسه ما اتافتقدوش"
                tone={week.pending_boys ? 'warn' : 'ok'}
              />
              <Stat value={week.follow_ups} label="افتقادات مسجلة" />
              <Stat value={scope.boys} label={`أولاد ${scopeWord}`} />
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
                sub={`${season.present} من ${season.total} سجل · ${fridays(season.sessions)}`}
              />
              <RateRow
                label="نسبة حضور القداس"
                value={season.liturgy}
                sub={`${season.liturgy_present} من ${season.total} سجل`}
              />
              <RateRow
                label="نسبة التحضير"
                value={season.prepare}
                sub={`من ${reviews(season.checks)} مسجلة`}
              />
              <RateRow label="نسبة اجتماع الخدام" value={season.teachers_meeting} />
              <RateRow
                label="نسبة الافتقاد"
                value={season.follow}
                sub={`${season.followed_boys} من ${scope.boys} ${boysWord(scope.boys)}`}
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
