import { useAuth } from '../../context/AuthContext'
import { useTopbarTitle } from '../../context/TitleContext'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

/** Topbar — page title on the leading side, identity chip on the trailing. */
export function Topbar({ onMenu }) {
  const { user } = useAuth()
  const title = useTopbarTitle()
  const name = user?.display_name || user?.email

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="menu-toggle" onClick={onMenu} aria-label="فتح القائمة">
          <Icon name="menu" size={18} />
        </button>
        <div className="topbar__title">{title || 'فصلي'}</div>
      </div>

      <div className="topbar__right">
        <span className="user-chip">
          <Avatar name={name} size="sm" />
          <span className="user-chip__name">{name}</span>
        </span>
      </div>
    </header>
  )
}
