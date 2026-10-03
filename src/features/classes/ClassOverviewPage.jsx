import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { ClassDialog } from './ClassDialog'
import './class.css'

/** The three quick actions under the stats, gated by role. */
function QuickAction({ to, icon, label, hint }) {
  return (
    <Link to={to} className="quick-action">
      <span className="quick-action__icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="quick-action__text">
        <span className="quick-action__label">{label}</span>
        <span className="quick-action__hint">{hint}</span>
      </span>
      <Icon name="chevron" size={16} className="quick-action__go" />
    </Link>
  )
}

export default function ClassOverviewPage() {
  const { classId } = useParams()
  const { classLabel, classOf, can, user, isBoy } = useAuth()
  const label = classLabel(classId)
  usePageTitle(label)

  const isMgr = can.manageClasses(user)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const boys = await BoyAPI.list({ class_id: classId })
      const teachers = isBoy ? [] : await TeacherAPI.list({ class_id: classId })
      return { boys, teachers }
    },
    [classId, isBoy],
  )

  const cls = classOf(classId)
  const flagged = (data?.boys || []).filter((b) => b.issue_flag).length

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <Link to="/">الفصول</Link>
            <span aria-hidden="true">/</span>
            <span>{label}</span>
          </nav>
          <h1 className="page-head__title">{label}</h1>
          <div className="page-head__sub">
            {cls?.academic_year || '—'}
            {flagged > 0 && ` · ${flagged} محتاجين متابعة`}
          </div>
        </div>
        {isMgr && <ClassDialog class={cls} onSaved={refetch} trigger="icon" />}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="overview-stats">
            <div className="stat-card stat-card--dark">
              <span className="stat-card__accent" />
              <div className="stat-card__label">الأولاد</div>
              <div className="stat-card__value">
                {loading ? '—' : data?.boys?.length ?? 0}
              </div>
              <div className="stat-card__hint">
                {loading ? 'جارٍ التحميل' : flagged > 0 ? `${flagged} محتاجين متابعة` : 'كلهم تمام'}
              </div>
            </div>

            {!isBoy && (
              <div className="stat-card">
                <span className="stat-card__accent" />
                <div className="stat-card__label">الخدام</div>
                <div className="stat-card__value">
                  {loading ? '—' : data?.teachers?.length ?? 0}
                </div>
                <div className="stat-card__hint">
                  {loading ? 'جارٍ التحميل' : 'مسندين للفصل'}
                </div>
              </div>
            )}

            <div className="stat-card">
              <span className="stat-card__accent" />
              <div className="stat-card__label">السنة الدراسية</div>
              <div className="stat-card__value" style={{ fontSize: 'var(--text-2xl)' }}>
                {cls?.academic_year || '—'}
              </div>
              <div className="stat-card__hint">
                <Badge kind="gold">نشط</Badge>
              </div>
            </div>
          </div>

          {loading && <SkeletonRows rows={3} cols={3} />}

          <div className="quick-grid">
            <QuickAction
              to={`/class/${classId}/attendance`}
              icon="calendar"
              label="تسجيل الحضور"
              hint="حضور جمعة الأسبوع"
            />
            <QuickAction
              to={`/class/${classId}/followup`}
              icon="heart"
              label="الافتقاد الأسبوعي"
              hint="متابعة الافتقادات"
            />
            {!isBoy && (
              <QuickAction
                to={`/class/${classId}/boys`}
                icon="boys"
                label="بيانات الأولاد"
                hint="السجل الكامل"
              />
            )}
            {isMgr && (
              <QuickAction
                to={`/class/${classId}/checks`}
                icon="clipboard"
                label="متابعة الخدام"
                hint="تقرير الأسبوع"
              />
            )}
            {isMgr && (
              <QuickAction
                to={`/class/${classId}/teachers`}
                icon="servant"
                label="الخدام"
                hint="دليل الخدام"
              />
            )}
          </div>
        </>
      )}
    </>
  )
}
