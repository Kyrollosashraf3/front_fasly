import { useAuth } from '../../context/AuthContext'
import { useTopbarTitle } from '../../context/TitleContext'
import { userLabel } from '../../lib/constants'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

/** Topbar — page title on the leading side, identity chip on the trailing.
 *  It is the only place a page name is shown, so the name lives here. */
export function Topbar({ onMenu }) {
  const { user } = useAuth()
  const title = useTopbarTitle()
  const name = userLabel(user)

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="menu-toggle" onClick={onMenu} aria-label="فتح القائمة">
          <Icon name="menu" size={18} />
        </button>
        <h1 className="topbar__title">{title || 'فصلي'}</h1>
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
