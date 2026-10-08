import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { ROLE_LABELS } from '../../lib/roles'
import { userLabel } from '../../lib/constants'
import { accountLinks, classHref, classIdFrom, classLinks, navClass, rootLinks } from './navLinks'

function NavItem({ to, icon, label, end, onClick }) {
  return (
    <NavLink to={to} end={end} className={navClass()} onClick={onClick}>
      <span className="nav-link__icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

/** Global links — shown on every screen. */
function RootNav({ onNavigate }) {
  const auth = useAuth()
  return (
    <div className="sidebar__section">
      <div className="sidebar__label">القائمة</div>
      {rootLinks(auth).map((l) => (
        <NavItem key={l.to} {...l} onClick={onNavigate} />
      ))}
    </div>
  )
}

/** The class-scoped group: overview / boys / attendance / servants / follow-up. */
function ClassNav({ classId, onNavigate }) {
  const { isManager, classLabel, classOf, classes } = useAuth()
  const cls = classOf(classId)
  const multi = classes.length > 1

  return (
    <>
      {multi && (
        <NavLink to="/" className={navClass('nav-link nav-link--back')} end onClick={onNavigate}>
          <span className="nav-link__icon">
            <Icon name="chevronStart" size={15} />
          </span>
          كل الفصول
        </NavLink>
      )}

      <div className="sidebar__class">
        <div className="sidebar__class-name">{classLabel(classId)}</div>
        {cls?.academic_year && <div className="sidebar__class-year">{cls.academic_year}</div>}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__label">إدارة الفصل</div>
        {classLinks({ isManager }).map((l) => (
          <NavItem
            key={l.path}
            to={classHref(classId, l.path)}
            icon={l.icon}
            label={l.label}
            end={l.end}
            onClick={onNavigate}
          />
        ))}
      </div>
    </>
  )
}

/** Quick jump list, shown on the home screen. */
function ClassesList({ onNavigate }) {
  const { classes, classReady } = useAuth()
  // One class = the jump list would be a single copy of the link above it.
  if (!classReady || classes.length < 2) return null

  return (
    <div className="sidebar__section">
      <div className="sidebar__label">الفصول</div>
      {classes.map((c) => (
        <NavItem key={c.id} to={`/class/${c.id}`} icon="list" label={c.name} onClick={onNavigate} />
      ))}
    </div>
  )
}

export function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const classId = classIdFrom(pathname)

  const handleLogout = () => {
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
        {classId ? <ClassNav classId={classId} onNavigate={onClose} /> : <ClassesList onNavigate={onClose} />}
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
