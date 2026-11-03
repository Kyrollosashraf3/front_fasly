import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useLastClassId } from '../../hooks'
import { Icon } from '../ui/Icon'
import { accountLinks, classIdFrom, menuSections } from './navLinks'
import { Sheet } from './Sheet'
import { MenuSheetBody, MeSheetBody } from './BottomSheets'

const TABS = [
  { key: 'home', icon: 'home', label: 'الرئيسية' },
  { key: 'menu', icon: 'grid', label: 'القائمة' },
  { key: 'me', icon: 'user', label: 'الحساب' },
]

/**
 * BottomBar — the mobile navigation.
 *
 * The desktop keeps its sidebar; a phone gets three things under the thumb:
 * the home screen, one sheet holding every module as a tile, and the account.
 * Rendered by AppShell, hidden by CSS above the mobile breakpoint.
 */
export function BottomBar() {
  const auth = useAuth()
  const { user, logout, classes, classReady, canAccess, can, isBoy } = auth
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
  // On a global route a single-class login keeps his class's tiles alive.
  const lastClass = useLastClassId(classId)
  const remembered = lastClass && classReady && canAccess(lastClass) ? lastClass : null
  const myClassId = classReady && classes.length === 1 ? String(classes[0].id) : classId || remembered
  const routeTab = pathname === '/profile' ? 'me' : pathname === '/' ? 'home' : 'menu'
  const active = sheet || routeTab

  const sections = useMemo(
    () => menuSections({ can, user, isBoy, classes, myClassId }),
    [can, user, isBoy, classes, myClassId],
  )

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

  return (
    <>
      <nav className="tabbar" aria-label="التنقل السريع">
        {TABS.map((tab) => {
          const cls = `tabbar__btn${active === tab.key ? ' is-active' : ''}`
          const inner = (
            <>
              <span className="tabbar__icon">
                <Icon name={tab.icon} size={20} />
              </span>
              <span className="tabbar__label">{tab.label}</span>
            </>
          )

          if (tab.key === 'home') {
            return (
              <Link key={tab.key} to="/" className={cls} aria-label={tab.label}>
                {inner}
              </Link>
            )
          }

          return (
            <button
              key={tab.key}
              type="button"
              className={cls}
              aria-expanded={sheet === tab.key}
              onClick={() => setSheet((current) => (current === tab.key ? null : tab.key))}
            >
              {inner}
            </button>
          )
        })}
      </nav>

      <Sheet open={sheet === 'menu'} title="القائمة" onClose={close}>
        <MenuSheetBody sections={sections} onLogout={handleLogout} close={close} />
      </Sheet>

      <Sheet open={sheet === 'me'} title="الحساب" onClose={close}>
        <MeSheetBody user={user} links={accountLinks} onLogout={handleLogout} close={close} />
      </Sheet>
    </>
  )
}
