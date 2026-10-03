import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { ROLE_LABELS } from '../../lib/roles'

function NavItem({ to, icon, label, end, onClick }) {
  return (
    <NavLink to={to} end={end} className="nav-link" onClick={onClick}>
      <span className="nav-link__icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

/** Global links — shown on every screen. */
function RootNav({ onNavigate }) {
  const { user, isBoy, can } = useAuth()
  const dashboards = can.seeDashboards(user)

  return (
    <div className="sidebar__section">
      <div className="sidebar__label">القائمة</div>
      <NavItem to="/" icon="home" label="الرئيسية" end onClick={onNavigate} />
      {!isBoy && <NavItem to="/groups" icon="groups" label="المجموعات" onClick={onNavigate} />}
      {!isBoy && <NavItem to="/reveal" icon="sparkles" label="اكشفلي" onClick={onNavigate} />}
      {dashboards && (
        <NavItem to="/dashboard/boys" icon="chart" label="أداء الأولاد" onClick={onNavigate} />
      )}
      {dashboards && (
        <NavItem to="/dashboard/teachers" icon="star" label="أداء الخدام" onClick={onNavigate} />
      )}
    </div>
  )
}

/** The class-scoped group: overview / boys / attendance / servants / follow-up. */
function ClassNav({ classId, onNavigate }) {
  const { isManager, classLabel, classOf } = useAuth()
  const base = `/class/${classId}`
  const cls = classOf(classId)

  const links = [
    { to: base, label: 'نظرة عامة', icon: 'home', end: true },
    { to: `${base}/boys`, label: 'بيانات الأولاد', icon: 'boys' },
    { to: `${base}/attendance`, label: 'الحضور', icon: 'calendar' },
    isManager && { to: `${base}/teachers`, label: 'الخدام', icon: 'servant' },
    isManager && { to: `${base}/checks`, label: 'متابعة الخدام', icon: 'clipboard' },
    { to: `${base}/followup`, label: 'الافتقاد', icon: 'heart' },
  ].filter(Boolean)

  return (
    <>
      <NavLink to="/" className="nav-link nav-link--back" end onClick={onNavigate}>
        <span className="nav-link__icon">
          <Icon name="chevronStart" size={15} />
        </span>
        كل الفصول
      </NavLink>

      <div className="sidebar__class">
        <div className="sidebar__class-name">{classLabel(classId)}</div>
        {cls?.academic_year && <div className="sidebar__class-year">{cls.academic_year}</div>}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__label">إدارة الفصل</div>
        {links.map((l) => (
          <NavItem key={l.to} {...l} onClick={onNavigate} />
        ))}
      </div>
    </>
  )
}

/** Quick jump list, shown on the home screen. */
function ClassesList({ onNavigate }) {
  const { classes, classReady } = useAuth()
  if (!classReady || !classes.length) return null

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

  const match = pathname.match(/^\/class\/(\d+)/)
  const classId = match ? match[1] : null

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
          <Avatar name={user?.display_name || user?.email} size="sm" gold />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="sidebar__user-name">{user?.display_name || user?.email}</div>
            <div className="sidebar__user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
        </div>

        <NavItem to="/profile" icon="user" label="الحساب" onClick={onClose} />

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
