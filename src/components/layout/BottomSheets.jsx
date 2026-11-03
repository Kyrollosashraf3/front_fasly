import { Avatar } from '../ui/Avatar'
import { ROLE_LABELS } from '../../lib/roles'
import { userLabel } from '../../lib/constants'
import { accountLinks } from './navLinks'
import { NavTile, NavTileGrid, NavTileSection } from './NavTiles'
import { SheetLink, SheetButton } from './Sheet'

/** Profile and logout, as two tiles — the same shape as everything above them. */
function AccountTiles({ onLogout, close }) {
  return (
    <div className="nav-group">
      <div className="nav-group__label">الحساب</div>
      <NavTileGrid>
        {accountLinks.map((l) => (
          <NavTile key={l.to} {...l} onNavigate={close} />
        ))}
        <NavTile icon="logout" label="تسجيل الخروج" onClick={onLogout} danger />
      </NavTileGrid>
    </div>
  )
}

/**
 * MenuSheetBody — every module the person can open, in tiles three across,
 * instead of a long list of rows that had to be scrolled and read one by one.
 */
export function MenuSheetBody({ sections, onLogout, close }) {
  return (
    <>
      {sections.map((section) => (
        <NavTileSection key={section.label} {...section} onNavigate={close} />
      ))}
      <AccountTiles onLogout={onLogout} close={close} />
    </>
  )
}

export function MeSheetBody({ user, links, onLogout, close }) {
  return (
    <>
      <div className="sheet__me">
        <Avatar name={userLabel(user)} size="md" gold />
        <div className="sheet__me-text">
          <div className="sheet__me-name">{userLabel(user)}</div>
          <div className="sheet__me-role">{ROLE_LABELS[user?.role] || user?.role}</div>
        </div>
      </div>
      {links.map((l) => (
        <SheetLink key={l.to} {...l} onNavigate={close} />
      ))}
      <SheetButton icon="logout" label="تسجيل الخروج" onClick={onLogout} danger />
    </>
  )
}
