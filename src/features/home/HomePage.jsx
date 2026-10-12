import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'

import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { ClassDialog } from '../classes/ClassDialog'
import './home.css'

/**
 * HomePage — the class catalogue.
 *
 * Counts come from ONE scoped /boys (+ /teachers for managers) request grouped
 * client-side, instead of the old one-request-per-class.
 *
 * A login that belongs to one class (an amin, a servant, a boy) never sees it:
 * the catalogue would only repeat his own class title, so he is sent straight to
 * it. Only a multi-class login — the super admin — gets the grid.
 */
export default function HomePage() {
  usePageTitle('الفصول')
  const { user, classes, classReady, refreshClasses, can, isBoy, isServant } = useAuth()
  const isMgr = can.manageClasses(user)

  const single = classReady && classes.length === 1

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const boys = await BoyAPI.list()
      // The servant count is a nice-to-have: if it alone fails, still paint the
      // catalogue instead of turning the whole page into an error.
      const teachers = isMgr ? await TeacherAPI.list().catch(() => []) : []
      return { boys, teachers }
    },
    [isMgr],
    // Wait for the catalogue first: a single-class login is redirected away, so
    // counting boys for a grid nobody will see is a wasted request.
    { enabled: classReady && classes.length !== 1 },
  )

  if (single) return <Navigate to={`/class/${classes[0].id}`} replace />

  const countBy = (rows) => {
    const map = new Map()
    for (const row of rows || []) map.set(row.class_id, (map.get(row.class_id) || 0) + 1)
    return map
  }

  const boysByClass = countBy(data?.boys)
  const teachersByClass = countBy(data?.teachers)

  const subtitle = (classId) => {
    if (isBoy) return 'حسابك'
    const boys = boysByClass.get(classId) || 0
    if (isServant) return `${boys} في مجمعتي`
    return `${boys} ولد · ${teachersByClass.get(classId) || 0} خادم`
  }

  const year = classes[0]?.academic_year

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">الفصول</h1>
          <div className="page-head__sub">
            {year ? `العام الدراسي ${year}` : 'اختار فصل عشان تبدأ'}
            {classes.length > 0 && ` · ${classes.length} فصل`}
          </div>
        </div>
        {isMgr && <ClassDialog onSaved={refreshClasses} />}
      </div>

      {!classReady || loading ? (
        <div className="home-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="class-card class-card--skeleton">
              <div className="skeleton" style={{ height: 20, width: '60%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
              <div className="skeleton" style={{ height: 34, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon="list"
          title="لا توجد فصول مسندة"
          message={
            isMgr
              ? 'ابدأ بإضافة فصل جديد عشان تضيف الأولاد والخدام.'
              : 'مفيش فصل مسكّر على حسابك. كلّم الأدمن.'
          }
          action={isMgr ? <ClassDialog onSaved={refreshClasses} trigger="btn" /> : null}
        />
      ) : (
        <div className="home-grid">
          {classes.map((c) => (
            <a key={c.id} href={`#/class/${c.id}`} className="class-card">
              <div className="class-card__top">
                <span className="class-card__icon">
                  <Icon name="boys" size={22} />
                </span>
                <Badge kind="gold">{c.academic_year}</Badge>
              </div>

              <h3 className="class-card__name">{c.name}</h3>
              <div className="class-card__meta">{subtitle(c.id)}</div>

              {!loading && (
                <div className="class-card__stats">
                  <div className="class-card__stat">
                    <span className="class-card__stat-num">
                      {boysByClass.get(c.id) ?? '—'}
                    </span>
                    <span className="class-card__stat-label">الأولاد</span>
                  </div>
                  <div className="class-card__stat">
                    <span className="class-card__stat-num">
                      {isBoy ? '—' : teachersByClass.get(c.id) ?? '—'}
                    </span>
                    <span className="class-card__stat-label">الخدام</span>
                  </div>
                </div>
              )}

              <span className="class-card__go">
                افتح الفصل <Icon name="chevron" size={15} />
              </span>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
