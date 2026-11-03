import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { navClass } from './navLinks'

/** Bottom sheet — the phone's answer to the desktop sidebar drawer. */
export function Sheet({ open, title, onClose, children }) {
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

export function SheetLink({ to, icon, label, end, onNavigate }) {
  return (
    <NavLink to={to} end={end} className={navClass('sheet__item')} onClick={onNavigate}>
      <span className="sheet__item-icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function SheetButton({ icon, label, onClick, danger }) {
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
