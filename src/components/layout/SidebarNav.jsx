import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../ui/Icon'
import { classHref, classLinks, globalModules, navClass, rootLinks } from './navLinks'

export function NavItem({ to, icon, label, end, onClick }) {
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
export function RootNav({ onNavigate }) {
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

/**
 * The super admin's modules — global routes, each with its own class filter.
 * No class is picked here: that lives inside every page.
 */
export function GlobalNav({ onNavigate }) {
  const auth = useAuth()
  return (
    <div className="sidebar__section">
      <div className="sidebar__label">الوحدات</div>
      {globalModules(auth).map((l) => (
        <NavItem key={l.to} {...l} onClick={onNavigate} />
      ))}
    </div>
  )
}

/** The class-scoped group: overview / boys / attendance / servants / follow-up. */
export function ClassNav({ classId, onNavigate }) {
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
export function ClassesList({ onNavigate }) {
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
