import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Loading } from '../../components/ui/States'
import { NavTileSection } from '../../components/layout/NavTiles'
import { accountLinks, classHref } from '../../components/layout/navLinks'
import { userLabel } from '../../lib/constants'
import { ROLE_LABELS } from '../../lib/roles'
import { HomeDashboard } from './HomeDashboard'
import './home.css'

/** The day has three faces in Arabic; picking one makes the screen feel lived-in. */
function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'صباح الخير'
  if (hour < 17) return 'نهارك سعيد'
  return 'مساء الخير'
}

/**
 * HomeHero — who is looking, and at which class.
 * The only chrome on this screen; everything else is numbers.
 */
function HomeHero({ name, role, className }) {
  return (
    <section className="home-hero">
      <div className="home-hero__hello">{greeting()}</div>
      <div className="home-hero__name">{name}</div>
      <div className="home-hero__meta">
        {role && <span className="home-hero__chip">{role}</span>}
        {className && (
          <span className="home-hero__chip home-hero__chip--gold">
            <Icon name="home" size={13} />
            {className}
          </span>
        )}
      </div>
    </section>
  )
}

/**
 * HomePage — the service, not the menu.
 *
 * A staff login lands on his own numbers: the week that just went and the
 * church year so far, for his group as a servant or his class as an amin. The
 * doors to every module live in the phone's «القائمة» sheet and the desktop
 * sidebar, so the home screen never has to repeat them.
 */
export default function HomePage() {
  usePageTitle('الرئيسية')
  const { user, classes, classReady, isBoy, classLabel } = useAuth()

  const single = classReady && classes.length === 1
  const myClassId = single ? String(classes[0].id) : null

  return (
    <>
      <HomeHero
        name={userLabel(user)}
        role={ROLE_LABELS[user?.role] || ''}
        className={myClassId ? classLabel(myClassId) : ''}
      />

      {!classReady ? (
        <div className="home-loading">
          <Loading label="جارٍ التحميل..." />
        </div>
      ) : isBoy ? (
        <div className="home-sections">
          <NavTileSection label="حسابي" items={accountLinks} />
        </div>
      ) : classes.length === 0 ? (
        <div className="state-block state-block--inline">
          <div className="state-block__icon">
            <Icon name="list" size={28} />
          </div>
          <div className="state-block__title">مفيش فصول</div>
          <div className="state-block__msg">لسه مفيش فصول متاحة لحسابك.</div>
        </div>
      ) : (
        <HomeDashboard followUpHref={myClassId ? classHref(myClassId, 'followup') : '/followup'} />
      )}
    </>
  )
}
