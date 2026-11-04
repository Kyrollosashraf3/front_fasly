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
 * that class's title — he starts on the class itself instead. A super admin and
 * a stage amin both see several classes, so they get the picker.
 */
export function rootLinks({ user, isBoy, can, classes = [] }) {
  const links = []

  if (classes.length > 1) {
    links.push({ to: '/', icon: 'home', label: 'الرئيسية', end: true })
  }

  if (!isBoy) {
    links.push({ to: '/groups', icon: 'groups', label: 'المجموعات' })
    if (can.manageTrips(user)) {
      links.push({ to: '/myTrip', icon: 'calendar', label: 'رحلتي' })
    }
    links.push({ to: '/tasks', icon: 'trophy', label: 'المسابقات' })
    links.push({ to: '/reveal', icon: 'sparkles', label: 'اكشفلي' })
    links.push({ to: '/birthdays', icon: 'gift', label: 'أعياد الميلاد' })
  }

  if (can.seeBoysDashboard(user)) {
    links.push({ to: '/dashboard/boys', icon: 'chart', label: 'أداء الأولاد' })
  }
  if (can.seeFollowUpPerformance(user)) {
    links.push({ to: '/dashboard/follow-up', icon: 'heart', label: 'أداء الافتقاد' })
  }
  if (can.seeTeachersDashboard(user)) {
    links.push({ to: '/dashboard/teachers', icon: 'star', label: 'أداء الخدام' })
  }
  if (can.sendNotifications(user)) {
    links.push({ to: '/notifications', icon: 'bell', label: 'إرسال إشعار' })
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

/**
 * The "modules" grid shown on the home page and in the phone's quick sheets.
 * Each entry is class-scoped (`path` relative to `/class/:id`).
 */
export function classModules({ can, user }) {
  const mods = [
    { path: '', icon: 'home', label: 'نظرة عامة', desc: 'ملخص الفصل', end: true },
    { path: 'boys', icon: 'boys', label: 'بيانات الأولاد', desc: 'سجل الأولاد وبياناتهم' },
    { path: 'attendance', icon: 'calendar', label: 'الحضور', desc: 'حضور الجمعة والقداس' },
    { path: 'followup', icon: 'heart', label: 'الافتقاد', desc: 'متابعة الأولاد والاتصال بهم' },
  ]

  if (can.seeServants(user)) {
    mods.push({ path: 'teachers', icon: 'servant', label: 'الخدام', desc: 'بيانات خدام الفصل' })
  }
  if (can.seeChecks(user)) {
    mods.push({ path: 'checks', icon: 'clipboard', label: 'متابعة الخدام', desc: 'تقييم الخدام أسبوعيًا' })
  }

  return mods
}

/**
 * The multi-class login's modules — global routes, each with its own class
 * filter. No class is picked here: that lives inside every page. A super admin
 * filters across the church's classes, a stage amin across his own group.
 */
export function globalModules({ can, user, allClassesLabel }) {
  return [
    can.manageClasses(user) && { to: '/classes', icon: 'list', label: 'الفصول', desc: 'إدارة الفصول الدراسية' },
    { to: '/boys', icon: 'boys', label: 'بيانات الأولاد', desc: `كل الأولاد في ${allClassesLabel}` },
    { to: '/attendance', icon: 'calendar', label: 'الحضور', desc: 'حضور جمعة الأسبوع' },
    { to: '/followup', icon: 'heart', label: 'الافتقاد', desc: 'متابعة الأولاد' },
    can.seeServants(user) && { to: '/teachers', icon: 'servant', label: 'دليل الخدام', desc: 'كل الخدام' },
    can.seeChecks(user) && { to: '/checks', icon: 'clipboard', label: 'متابعة الخدام', desc: 'تقييم الخدام أسبوعيًا' },
  ].filter(Boolean)
}

/**
 * The "تحليل" (analytics) modules — global routes, no class in the URL.
 * Boys performance is open to any staff member; servants performance and the
 * reveal picker follow their own permission.
 */
export function analyticsModules({ can, user }) {
  const out = [
    { to: '/dashboard/boys', icon: 'chart', label: 'أداء الأولاد', desc: 'مؤشرات الحضور والمواظبة' },
  ]
  if (can.seeFollowUpPerformance(user)) {
    out.push({ to: '/dashboard/follow-up', icon: 'heart', label: 'أداء الافتقاد', desc: 'نسب الافتقاد وأداء الخدام' })
  }
  if (can.seeTeachersDashboard(user)) {
    out.push({ to: '/dashboard/teachers', icon: 'star', label: 'أداء الخدام', desc: 'متابعة أداء الخدام' })
  }
  if (can.seeReveal(user)) {
    out.push({ to: '/reveal', icon: 'sparkles', label: 'اكشفلي', desc: 'اختيار عشوائي للأولاد' })
  }
  if (can.seeBirthdays(user)) {
    out.push({ to: '/birthdays', icon: 'gift', label: 'أعياد الميلاد', desc: 'مناسبات الشهر القادم' })
  }
  return out
}

/** Account links — identical everywhere they appear. */
export const accountLinks = [{ to: '/profile', icon: 'user', label: 'الحساب' }]

/**
 * The whole app as one grid — what the phone's menu sheet and the home screen
 * both show, so the two can never offer a different set of doors.
 *
 * Sections come back in reading order with absolute `to` hrefs, already
 * permission-filtered and with any module that appeared higher up removed:
 * «اكشفلي» is one tile, not three.
 */
export function menuSections({ can, user, isBoy, classes = [], myClassId }) {
  const seen = new Set()
  const fresh = (items) =>
    items.filter((item) => item && !seen.has(item.to) && (seen.add(item.to) || true))

  const sections = []

  // A boy's whole app is his own file: every module here is a staff screen.
  if (isBoy) return sections

  // One «الوحدات» group, never two. A multi-class login gets the global routes
  // and picks the class inside the page; a single-class login gets his own
  // class. Titling that group after the class only repeated the title he is
  // already looking at and duplicated every module under it.
  const mods =
    classes.length > 1
      ? globalModules({ can, user })
      : myClassId
        ? classModules({ can, user }).map((m) => ({ ...m, to: classHref(myClassId, m.path) }))
        : []

  if (mods.length) sections.push({ label: 'الوحدات', items: fresh(mods) })

  const analytics = fresh(analyticsModules({ can, user }))
  if (analytics.length) sections.push({ label: 'تحليل', items: analytics })

  // The home tab already is `/`, and the modules group above covers its links.
  const fixed = fresh(rootLinks({ user, isBoy, can }).filter((l) => l.to !== '/'))
  if (fixed.length) sections.push({ label: 'أقسام ثابتة', items: fixed })

  return sections.filter((s) => s.items.length)
}

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
