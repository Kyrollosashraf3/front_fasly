import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { SectionTitle } from '../../components/ui/Bits'
import { Loading } from '../../components/ui/States'
import { classHref, classModules, globalModules, analyticsModules } from '../../components/layout/navLinks'
import './home.css'

/** One module tile — icon, title, one-line description. */
function ModuleCard({ to, icon, label, desc }) {
  return (
    <Link to={to} className="module-card">
      <span className="module-card__icon">
        <Icon name={icon} size={24} />
      </span>
      <span className="module-card__text">
        <span className="module-card__label">{label}</span>
        {desc && <span className="module-card__desc">{desc}</span>}
      </span>
      <Icon name="chevron" size={16} className="module-card__go" />
    </Link>
  )
}

/**
 * HomePage — every module in one place.
 *
 * An amin or a servant lands on his own class and gets the module tiles
 * straight away; the super admin picks a class first, then the whole grid
 * lights up. The same links are mirrored in the phone's bottom bar so nothing
 * is ever more than two taps away.
 */
export default function HomePage() {
  usePageTitle('الرئيسية')
  const { user, classes, classReady, can, isBoy, classLabel } = useAuth()

  const multi = classReady && classes.length > 1

  const mods = useMemo(() => classModules({ can, user }), [can, user])
  const gmods = useMemo(() => globalModules({ can, user }), [can, user])
  const analytics = useMemo(() => analyticsModules({ can, user }), [can, user])

  if (isBoy) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1 className="page-head__title">الرئيسية</h1>
            <div className="page-head__sub">حسابك</div>
          </div>
        </div>
        <div className="module-grid">
          <ModuleCard to="/profile" icon="user" label="حسابي" desc="بياناتك ومتابعتك" />
        </div>
      </>
    )
  }

  const single = classReady && classes.length === 1

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">الرئيسية</h1>
          <div className="page-head__sub">
            {multi
              ? 'كل الوحدات في مكان واحد'
              : `${classLabel(String(classes[0]?.id ?? ''))} · كل الوحدات في مكان واحد`}
          </div>
        </div>
      </div>

      {!classReady ? (
        <div className="home-loading">
          <Loading label="جارٍ تحميل الوحدات..." />
        </div>
      ) : multi ? (
        <>
          <section className="home-section">
            <SectionTitle>الوحدات</SectionTitle>
            <div className="module-grid">
              {gmods.map((m) => (
                <ModuleCard key={m.to} to={m.to} icon={m.icon} label={m.label} desc={m.desc} />
              ))}
            </div>
          </section>

          {analytics.length > 0 && (
            <section className="home-section">
              <SectionTitle>تحليل</SectionTitle>
              <div className="module-grid">
                {analytics.map((m) => (
                  <ModuleCard key={m.to} to={m.to} icon={m.icon} label={m.label} desc={m.desc} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : single ? (
        <>
          <section className="home-section">
            <SectionTitle>وحدات الفصل</SectionTitle>
            <div className="module-grid">
              {mods.map((m) => (
                <ModuleCard
                  key={m.path || 'overview'}
                  to={classHref(classes[0].id, m.path)}
                  icon={m.icon}
                  label={m.label}
                  desc={m.desc}
                />
              ))}
            </div>
          </section>

          {analytics.length > 0 && (
            <section className="home-section">
              <SectionTitle>تحليل</SectionTitle>
              <div className="module-grid">
                {analytics.map((m) => (
                  <ModuleCard key={m.to} to={m.to} icon={m.icon} label={m.label} desc={m.desc} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="state-block state-block--inline">
          <div className="state-block__icon">
            <Icon name="list" size={28} />
          </div>
          <div className="state-block__title">مفيش فصول</div>
          <div className="state-block__msg">لسه مفيش فصول متاحة لحسابك.</div>
        </div>
      )}
    </>
  )
}
