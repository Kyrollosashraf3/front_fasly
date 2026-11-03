import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { EmptyState, Loading } from '../../components/ui/States'
import { ClassDialog } from './ClassDialog'
import '../home/home.css'
import './class.css'

/**
 * ClassesPage — the class catalogue as *management*, not navigation.
 *
 * A super admin sees every class at once on the module pages (each with its own
 * class filter), so the class list is no longer a way to pick a working class.
 * This page is only here to add a class or fix its name / academic year.
 */
export default function ClassesPage() {
  usePageTitle('الفصول')
  const { classes, classReady, can, user } = useAuth()
  const isMgr = can.manageClasses(user)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head__sub">{classReady ? `${classes.length} فصل` : ' '}</div>
        </div>
        {isMgr && <ClassDialog />}
      </div>

      {!classReady ? (
        <Loading label="جارٍ تحميل الفصول..." />
      ) : classes.length === 0 ? (
        <EmptyState icon="list" title="مفيش فصول" message="ضيف أول فصل للبداية." />
      ) : (
        <div className="module-grid">
          {classes.map((c) => (
            <div key={c.id} className="module-card">
              <span className="module-card__icon">
                <Icon name="list" size={24} />
              </span>
              <span className="module-card__text">
                <span className="module-card__label">{c.name}</span>
                {c.academic_year && (
                  <span className="module-card__desc">{c.academic_year}</span>
                )}
              </span>
              {isMgr && <ClassDialog class={c} trigger="icon" />}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
