/**
 * roles.js — the permission matrix in one place.
 *
 * The backend enforces all of this (see app/core/data/base.py); these helpers
 * only decide what the UI shows. Keeping them declarative means a screen never
 * has to reason about role strings — it asks `can.writeDirectory(user)`.
 */

export const ROLES = {
  USER: 'user',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  GENERAL_ADMIN: 'general_admin',
  SUPER_ADMIN: 'super_admin',
}

export const MANAGER_ROLES = [ROLES.ADMIN, ROLES.GENERAL_ADMIN, ROLES.SUPER_ADMIN]

/** The roles that invent a class — a stage amin is handed his, he does not add any. */
export const CLASS_KEEPERS = [ROLES.ADMIN, ROLES.SUPER_ADMIN]

export const ROLE_LABELS = {
  super_admin: 'أدمن عام',
  general_admin: 'أمين مرحلة',
  admin: 'أمين فصل',
  teacher: 'خادم',
  user: 'ولد',
}

export const ROLE_BADGE_KIND = {
  super_admin: 'gold',
  general_admin: 'navy',
  admin: 'navy',
  teacher: 'blue',
  user: 'green',
}

/** Options for the account form — the top two are only offered to a super_admin. */
export const ROLE_OPTIONS = [
  { value: ROLES.USER, label: 'ولد (حسابه وحده)' },
  { value: ROLES.TEACHER, label: 'خادم (مجموعته)' },
  { value: ROLES.ADMIN, label: 'أمين فصل (فصله)' },
  { value: ROLES.GENERAL_ADMIN, label: 'أمين مرحلة (خادم + مجموعة فصول)' },
  { value: ROLES.SUPER_ADMIN, label: 'أدمن عام (كل الفصول)' },
]

/** The roles only the church-wide amin may hand out — and the classes that go with them. */
export const SUPER_ONLY_ROLES = [ROLES.SUPER_ADMIN, ROLES.GENERAL_ADMIN]

const roleOf = (user) => user?.role
export const isManager = (user) => MANAGER_ROLES.includes(roleOf(user))

export const can = {
  /** Read/write the boys & servants directory, classes and accounts. */
  writeDirectory: (user) => isManager(user),

  /**
   * Add or edit a boy's file. Any staff member may (the backend allows the
   * class amin, a servant of that class and the super admin; a boy cannot).
   */
  writeBoys: (user) => roleOf(user) !== ROLES.USER,

  /**
   * Edit one boy's file (name, phones, address, ...). Any non-boy login may:
   * the backend allows the class amin, a servant of that class and the super
   * admin, and refuses a boy writing his own row.
   */
  editBoys: (user) => roleOf(user) !== ROLES.USER,

  /** Create/rename/delete a class — only a class amin or the church-wide amin. */
  manageClasses: (user) => CLASS_KEEPERS.includes(roleOf(user)),

  /** Fill the Friday attendance sheet. */
  writeAttendance: (user) => roleOf(user) !== ROLES.USER,

  /** Log a weekly follow-up contact (a servant logs only his own). */
  writeFollowUp: (user) => roleOf(user) !== ROLES.USER,

  /** The weekly servant check sheet — managers write everyone, a servant his own row. */
  writeChecks: (user) => roleOf(user) !== ROLES.USER,

  /** See the servant check sheet at all (a servant sees and fills his own). */
  seeChecks: (user) => roleOf(user) !== ROLES.USER,

  /** Assign boys to servant groups. */
  writeGroups: (user) => isManager(user),

  /** See the servants directory at all (a boy never does). */
  seeServants: (user) => roleOf(user) !== ROLES.USER,

  /** See the groups page. */
  seeGroups: (user) => roleOf(user) !== ROLES.USER,

  /** The "اكشفلي" random-picker page. */
  seeReveal: (user) => roleOf(user) !== ROLES.USER,

  /** Boys performance dashboard — any staff member (not a boy). */
  seeBoysDashboard: (user) => roleOf(user) !== ROLES.USER,

  /** Servants performance dashboard — managers only. */
  seeTeachersDashboard: (user) => isManager(user),

  /** Follow-up performance dashboard — any staff member (a servant: his own). */
  seeFollowUpPerformance: (user) => roleOf(user) !== ROLES.USER,

  /** Both performance dashboards (kept for the sidebar/shortcuts). */
  seeDashboards: (user) => isManager(user),

  /** The birthdays module — staff only, servant sees boys alone. */
  seeBirthdays: (user) => roleOf(user) !== ROLES.USER,

  /** The account administration table (profile page). */
  manageAccounts: (user) => isManager(user),

  /** Create/edit/retire trips (class subscriptions). Any staff member may
   * add a trip for his own class; only the super admin may pick another class. */
  manageTrips: (user) => roleOf(user) !== ROLES.USER,

  /** Open the competitions module at all (a boy never does). */
  seeTasks: (user) => roleOf(user) !== ROLES.USER,

  /** Open/close and edit a competition — the class amin or the general amin. */
  manageTasks: (user) => isManager(user),

  /** Register a boy's recitation and tick the طايو he collected. */
  writeRecitations: (user) => roleOf(user) !== ROLES.USER,

  /** Send a notification to the servants' phones — his own class for an amin,
   *  his own group for a stage amin, every class for the church-wide amin. */
  sendNotifications: (user) => isManager(user),

  /** Grant the super_admin or general_admin role, or hand out a class group. */
  grantSuperAdmin: (user) => roleOf(user) === ROLES.SUPER_ADMIN,
}

export const isSuperAdmin = (user) => roleOf(user) === ROLES.SUPER_ADMIN
export const isGeneralAdmin = (user) => roleOf(user) === ROLES.GENERAL_ADMIN
export const isServant = (user) => roleOf(user) === ROLES.TEACHER
export const isBoy = (user) => roleOf(user) === ROLES.USER
