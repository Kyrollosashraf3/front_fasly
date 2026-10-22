import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useLastClassId } from '../../hooks'
import { Icon } from '../ui/Icon'
import {
  accountLinks,
  analyticsModules,
  classIdFrom,
  classLinks,
  classModules,
  globalModules,
  rootLinks,
} from './navLinks'
import { Sheet } from './Sheet'
import { AccountLinks, HomeSheetBody, MeSheetBody, MenuSheetBody } from './BottomSheets'

const TABS = [
  { key: 'home', icon: 'home', label: 'الرئيسية' },
  { key: 'menu', icon: 'menu', label: 'القائمة' },
  { key: 'me', icon: 'user', label: 'الحساب' },
]

/**
 * BottomBar — the mobile navigation.
 *
 * The desktop keeps its sidebar; a phone gets four icons under the thumb and
 * every one of them opens a sheet of choices instead of a hidden drawer.
 * Rendered by AppShell, hidden by CSS above the mobile breakpoint.
 */
export function BottomBar() {
  const auth = useAuth()
  const { user, logout, classes, classReady, isManager, canAccess } = auth
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const modal = useModal()
  const [sheet, setSheet] = useState(null)

  const close = useCallback(() => setSheet(null), [])

  // Any navigation dismisses whatever sheet is open.
  useEffect(() => {
    setSheet(null)
  }, [pathname])

  const classId = classIdFrom(pathname)
  const single = classReady && classes.length === 1
  // A super admin works across every class, so his sheets carry global modules
  // instead of a class-scoped menu he would have to re-pick on every screen.
  const multi = classes.length > 1
  // On a global route a single-class login keeps his class's links alive.
  const lastClass = useLastClassId(classId)
  const remembered = lastClass && classReady && canAccess(lastClass) ? lastClass : null
  const myClassId = single ? String(classes[0].id) : classId || remembered
  const routeTab =
    pathname === '/profile' ? 'me' : pathname === '/' ? 'home' : classId ? 'menu' : 'home'
  const active = sheet || routeTab

  const roots = rootLinks(auth)
  const mods = classModules(auth)
  const gmods = globalModules(auth)
  const analytics = analyticsModules(auth)

  const handleLogout = async () => {
    const ok = await modal.confirm({
      title: 'تسجيل الخروج؟',
      message: 'هتخرج من حسابك على الجهاز ده.',
      confirmLabel: 'تسجيل الخروج',
      kind: 'danger',
    })
    if (!ok) return
    close()
    logout()
    navigate('/login', { replace: true })
  }

  const accountSection = (
    <AccountLinks links={accountLinks} onLogout={handleLogout} close={close} />
  )

  return (
    <>
      <nav className="tabbar" aria-label="التنقل السريع">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tabbar__btn${active === tab.key ? ' is-active' : ''}`}
            aria-expanded={sheet === tab.key}
            onClick={() => setSheet((current) => (current === tab.key ? null : tab.key))}
          >
            <span className="tabbar__icon">
              <Icon name={tab.icon} size={20} />
            </span>
            <span className="tabbar__label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <Sheet open={sheet === 'home'} title="الرئيسية" onClose={close}>
        <HomeSheetBody
          multi={multi}
          globalModules={gmods}
          classModules={mods}
          myClassId={myClassId}
          analytics={analytics}
          roots={roots}
          account={accountSection}
          close={close}
        />
      </Sheet>

      <Sheet open={sheet === 'menu'} title="القائمة" onClose={close}>
        <MenuSheetBody
          multi={multi}
          globalModules={gmods}
          roots={roots}
          myClassId={myClassId}
          single={single}
          isManager={isManager}
          classLinks={classLinks}
          account={accountSection}
          close={close}
        />
      </Sheet>

      <Sheet open={sheet === 'me'} title="الحساب" onClose={close}>
        <MeSheetBody user={user} links={accountLinks} onLogout={handleLogout} close={close} />
      </Sheet>
    </>
  )
}
