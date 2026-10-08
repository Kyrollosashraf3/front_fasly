/**
 * navLinks.js — the navigation model, shared by the desktop sidebar and the
 * mobile bottom bar so the two surfaces can never drift apart.
 *
 * Everything here is plain data; the callers decide how to render it
 * (`NavItem` in Sidebar.jsx, `SheetLink` in BottomBar.jsx).
 */

/**
 * Top-level links, already filtered by role. `auth` is the AuthContext value.
 *
 * The class catalogue is only linked when there is a choice to make: an amin,
 * a servant or a boy belongs to exactly one class, so `/` would just repeat
 * that class's title — he starts on the class itself instead.
 */
export function rootLinks({ user, isBoy, can, classes = [] }) {
  const links = []

  if (classes.length > 1) {
    links.push({ to: '/', icon: 'home', label: 'الفصول', end: true })
  }

  if (!isBoy) {
    links.push({ to: '/groups', icon: 'groups', label: 'المجموعات' })
    links.push({ to: '/reveal', icon: 'sparkles', label: 'اكشفلي' })
  }

  if (can.seeDashboards(user)) {
    links.push({ to: '/dashboard/boys', icon: 'chart', label: 'أداء الأولاد' })
    links.push({ to: '/dashboard/teachers', icon: 'star', label: 'أداء الخدام' })
  }

  return links
}

/**
 * Class-scoped links, `path` relative to `/class/:id`.
 * Servant-only entries are dropped for a boy login.
 */
export function classLinks({ isManager }) {
  const links = [
    { path: '', label: 'نظرة عامة', icon: 'home', end: true },
    { path: 'boys', label: 'بيانات الأولاد', icon: 'boys' },
    { path: 'attendance', label: 'الحضور', icon: 'calendar' },
  ]

  if (isManager) {
    links.push({ path: 'teachers', label: 'الخدام', icon: 'servant' })
    links.push({ path: 'checks', label: 'متابعة الخدام', icon: 'clipboard' })
  }

  links.push({ path: 'followup', label: 'الافتقاد', icon: 'heart' })
  return links
}

/** Account links — identical everywhere they appear. */
export const accountLinks = [{ to: '/profile', icon: 'user', label: 'الحساب' }]

export const classHref = (classId, path) =>
  `/class/${classId}${path ? `/${path}` : ''}`

/** `/class/12/boys` -> `"12"`; any other route -> `null`. */
export function classIdFrom(pathname) {
  const match = pathname.match(/^\/class\/(\d+)/)
  return match ? match[1] : null
}

/**
 * `NavLink` className callback. React Router only ever appends `active`, so
 * the styles here (`is-active`) have to be applied by hand.
 */
export const navClass = (base = 'nav-link') => ({ isActive }) =>
  isActive ? `${base} is-active` : base
