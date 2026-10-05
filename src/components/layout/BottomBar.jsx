import { useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { ROLE_LABELS } from '../../lib/roles'
import { userLabel } from '../../lib/constants'
import {
  accountLinks,
  classHref,
  classIdFrom,
  classLinks,
  navClass,
  rootLinks,
} from './navLinks'

/* ------------------------------------------------------------------ sheet */

/** Bottom sheet — the phone's answer to the desktop sidebar drawer. */
function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grip" aria-hidden="true" />
        <div className="sheet__head">
          <div className="sheet__title">{title}</div>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  )
}

function SheetLink({ to, icon, label, end, onNavigate }) {
  return (
    <NavLink to={to} end={end} className={navClass('sheet__item')} onClick={onNavigate}>
      <span className="sheet__item-icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function SheetButton({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      className={`sheet__item${danger ? ' sheet__item--danger' : ''}`}
      onClick={onClick}
    >
      <span className="sheet__item-icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

function SheetLabel({ children }) {
  return <div className="sheet__label">{children}</div>
}

/* -------------------------------------------------------------- tab bar */

const TABS = [
  { key: 'home', icon: 'home', label: 'الرئيسية' },
  { key: 'classes', icon: 'list', label: 'الفصول' },
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
  const { user, logout, classes, classReady, isManager } = auth
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState(null)

  const close = useCallback(() => setSheet(null), [])

  // Any navigation dismisses whatever sheet is open.
  useEffect(() => {
    setSheet(null)
  }, [pathname])

  const classId = classIdFrom(pathname)
  const routeTab = pathname === '/profile' ? 'me' : classId ? 'menu' : 'home'
  const active = sheet || routeTab

  const roots = rootLinks(auth)

  const handleLogout = () => {
    close()
    logout()
    navigate('/login', { replace: true })
  }

  const accountSection = (
    <>
      <SheetLabel>الحساب</SheetLabel>
      {accountLinks.map((l) => (
        <SheetLink key={l.to} {...l} onNavigate={close} />
      ))}
      <SheetButton icon="logout" label="تسجيل الخروج" onClick={handleLogout} danger />
    </>
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

      <Sheet open={sheet === 'home'} title="الوصول السريع" onClose={close}>
        <SheetLabel>الوصول السريع</SheetLabel>
        {roots.map((l) => (
          <SheetLink key={l.to} {...l} onNavigate={close} />
        ))}
        {accountSection}
      </Sheet>

      <Sheet open={sheet === 'classes'} title="الفصول" onClose={close}>
        <SheetLabel>الفصول</SheetLabel>
        <SheetLink to="/" end icon="list" label="كل الفصول" onNavigate={close} />
        {!classReady ? (
          <p className="muted small sheet__note">جاري تحميل الفصول...</p>
        ) : classes.length === 0 ? (
          <p className="muted small sheet__note">لسه مفيش فصول.</p>
        ) : (
          classes.map((c) => (
            <SheetLink key={c.id} to={`/class/${c.id}`} icon="list" label={c.name} onNavigate={close} />
          ))
        )}
        {accountSection}
      </Sheet>

      <Sheet open={sheet === 'menu'} title="القائمة" onClose={close}>
        {classId ? (
          <>
            <SheetLink to="/" end icon="chevronStart" label="كل الفصول" onNavigate={close} />
            <SheetLabel>إدارة الفصل</SheetLabel>
            {classLinks({ isManager }).map((l) => (
              <SheetLink
                key={l.path}
                to={classHref(classId, l.path)}
                icon={l.icon}
                label={l.label}
                end={l.end}
                onNavigate={close}
              />
            ))}
            <SheetLabel>أقسام ثابتة</SheetLabel>
            {roots.map((l) => (
              <SheetLink key={l.to} {...l} onNavigate={close} />
            ))}
          </>
        ) : (
          <>
            <SheetLabel>القائمة</SheetLabel>
            {roots.map((l) => (
              <SheetLink key={l.to} {...l} onNavigate={close} />
            ))}
          </>
        )}
        {accountSection}
      </Sheet>

      <Sheet open={sheet === 'me'} title="الحساب" onClose={close}>
        <div className="sheet__me">
          <Avatar name={userLabel(user)} size="md" gold />
          <div className="sheet__me-text">
            <div className="sheet__me-name">{userLabel(user)}</div>
            <div className="sheet__me-role">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
        </div>
        {accountLinks.map((l) => (
          <SheetLink key={l.to} {...l} onNavigate={close} />
        ))}
        <SheetButton icon="logout" label="تسجيل الخروج" onClick={handleLogout} danger />
      </Sheet>
    </>
  )
}
