import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { navClass } from './navLinks'

/**
 * One door into the app: icon over its name, in a grid three across on a phone.
 * Used by the home screen and the phone's menu sheet, so a module looks and
 * reads the same wherever it is reached from.
 */
export function NavTile({ to, icon, label, desc, end, danger, onClick, onNavigate }) {
  const inner = (
    <>
      <span className="nav-tile__icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="nav-tile__text">
        <span className="nav-tile__label">{label}</span>
        {desc && <span className="nav-tile__desc">{desc}</span>}
      </span>
    </>
  )

  const cls = `nav-tile${danger ? ' nav-tile--danger' : ''}`

  if (to) {
    return (
      <NavLink to={to} end={end} className={navClass(cls)} onClick={onNavigate}>
        {inner}
      </NavLink>
    )
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  )
}

/** The grid itself — three tiles per row under a thumb, more on a wider screen. */
export function NavTileGrid({ children, className = '' }) {
  return <div className={`nav-tiles ${className}`.trim()}>{children}</div>
}

/** A section of tiles with its heading, the way the menu sheet stacks them. */
export function NavTileSection({ label, items, onNavigate }) {
  return (
    <div className="nav-group">
      <div className="nav-group__label">{label}</div>
      <NavTileGrid>
        {items.map((item) => (
          <NavTile key={item.to || item.label} {...item} onNavigate={onNavigate} />
        ))}
      </NavTileGrid>
    </div>
  )
}
