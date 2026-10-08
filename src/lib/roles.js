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
  SUPER_ADMIN: 'super_admin',
}

export const MANAGER_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN]

export const ROLE_LABELS = {
  super_admin: 'أدمن عام',
  admin: 'أمين فصل',
  teacher: 'خادم',
  user: 'ولد',
}

export const ROLE_BADGE_KIND = {
  super_admin: 'gold',
  admin: 'navy',
  teacher: 'blue',
  user: 'green',
}

/** Options for the account form — super_admin only offered to a super_admin. */
export const ROLE_OPTIONS = [
  { value: ROLES.USER, label: 'ولد (حسابه وحده)' },
  { value: ROLES.TEACHER, label: 'خادم (مجموعته)' },
  { value: ROLES.ADMIN, label: 'أمين فصل (فصله)' },
  { value: ROLES.SUPER_ADMIN, label: 'أدمن عام (كل الفصول)' },
]

const roleOf = (user) => user?.role
export const isManager = (user) => MANAGER_ROLES.includes(roleOf(user))

export const can = {
  /** Read/write the boys & servants directory, classes and accounts. */
  writeDirectory: (user) => isManager(user),

  /**
   * Edit one boy's file (name, phones, address, ...). Any non-boy login may:
   * the backend allows the class amin, a servant of that class and the super
   * admin, and refuses a boy writing his own row.
   */
  editBoys: (user) => roleOf(user) !== ROLES.USER,

  /** Create/rename/delete a class. */
  manageClasses: (user) => isManager(user),

  /** Fill the Friday attendance sheet. */
  writeAttendance: (user) => roleOf(user) !== ROLES.USER,

  /** Log a weekly follow-up contact (a servant logs only his own). */
  writeFollowUp: (user) => roleOf(user) !== ROLES.USER,

  /** The weekly servant check sheet — managers only (an amin's job). */
  writeChecks: (user) => isManager(user),

  /** Assign boys to servant groups. */
  writeGroups: (user) => isManager(user),

  /** See the servants directory at all (a boy never does). */
  seeServants: (user) => roleOf(user) !== ROLES.USER,

  /** See the groups page. */
  seeGroups: (user) => roleOf(user) !== ROLES.USER,

  /** The "اكشفلي" random-picker page. */
  seeReveal: (user) => roleOf(user) !== ROLES.USER,

  /** Both performance dashboards. */
  seeDashboards: (user) => isManager(user),

  /** The account administration table (profile page). */
  manageAccounts: (user) => isManager(user),

  /** Grant the super_admin role. */
  grantSuperAdmin: (user) => roleOf(user) === ROLES.SUPER_ADMIN,
}

export const isSuperAdmin = (user) => roleOf(user) === ROLES.SUPER_ADMIN
export const isServant = (user) => roleOf(user) === ROLES.TEACHER
export const isBoy = (user) => roleOf(user) === ROLES.USER
