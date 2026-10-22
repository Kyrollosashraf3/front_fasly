import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useLastClassId } from '../../hooks'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { ROLE_LABELS } from '../../lib/roles'
import { userLabel } from '../../lib/constants'
import { accountLinks, classIdFrom } from './navLinks'
import { ClassesList, ClassNav, GlobalNav, NavItem, RootNav } from './SidebarNav'

export function Sidebar({ onClose }) {
  const { user, logout, classes, classReady, canAccess } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const modal = useModal()

  // Keep the class links visible on global routes by remembering the last
  // class the user opened (a single-class login uses his only class).
  const inClass = classIdFrom(pathname)
  const lastClass = useLastClassId(inClass)
  const remembered = lastClass && classReady && canAccess(lastClass) ? lastClass : null
  const classId = inClass || remembered || (classReady && classes.length === 1 ? String(classes[0].id) : null)
  // A super admin works across every class, so he gets global modules instead
  // of a class-scoped menu he would have to re-pick on every screen.
  const multi = classes.length > 1

  const handleLogout = async () => {
    const ok = await modal.confirm({
      title: 'تسجيل الخروج؟',
      message: 'هتخرج من حسابك على الجهاز ده.',
      confirmLabel: 'تسجيل الخروج',
      kind: 'danger',
    })
    if (!ok) return
    logout()
    onClose?.()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">ف</span>
        <div className="sidebar__brand-text">
          <div className="sidebar__title">فصلي</div>
          <div className="sidebar__subtitle">إدارة مدارس الأحد</div>
        </div>
      </div>

      <div className="sidebar__body">
        <RootNav onNavigate={onClose} />
        {multi ? (
          <GlobalNav onNavigate={onClose} />
        ) : classId ? (
          <ClassNav classId={classId} onNavigate={onClose} />
        ) : (
          <ClassesList onNavigate={onClose} />
        )}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <Avatar name={userLabel(user)} size="sm" gold />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="sidebar__user-name">{userLabel(user)}</div>
            <div className="sidebar__user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
        </div>

        {accountLinks.map((l) => (
          <NavItem key={l.to} {...l} onClick={onClose} />
        ))}

        <button type="button" className="nav-link" onClick={handleLogout} style={{ width: '100%' }}>
          <span className="nav-link__icon">
            <Icon name="logout" size={17} />
          </span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
