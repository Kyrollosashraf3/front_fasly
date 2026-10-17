import { Link, useLocation } from 'react-router-dom'

/**
 * AuthTabs — the two-button switcher pinned to the top of the sign in / sign up
 * screens, so a person can hop between "تفعيل الحساب" and "تسجيل الدخول" without
 * a dead end. Which one is active is read straight from the URL.
 */
export function AuthTabs() {
  const { pathname } = useLocation()

  const tabs = [
    { to: '/signup', label: 'تفعيل الحساب' },
    { to: '/login', label: 'تسجيل الدخول' },
  ]

  return (
    <div className="auth-tabs" role="tablist">
      {tabs.map((tab) => {
        const active = pathname === tab.to
        return (
          <Link
            key={tab.to}
            to={tab.to}
            role="tab"
            aria-selected={active}
            className={`auth-tabs__btn${active ? ' is-active' : ''}`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
