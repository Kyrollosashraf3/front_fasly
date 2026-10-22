export const OWNER_ROLES = ['teacher', 'admin']

export const EMPTY_USER = {
  phone: '',
  password: '',
  role: 'user',
  teacher_id: '',
  boy_id: '',
}

/** How a login is addressed: the phone he signs in with. */
export const handleOf = (u) => u?.phone || '—'

/** The servant / boy a login is attached to, resolved from the loaded lists. */
export const attachedTeacher = (teachers, u) =>
  u?.teacher_id ? teachers.find((t) => t.id === u.teacher_id) || null : null

export const attachedBoy = (boys, u) =>
  u?.boy_id ? boys.find((b) => b.id === u.boy_id) || null : null

/**
 * The name of an account, resolved from the loaded servants/boys lists. Kept at
 * module scope so the search/sort memo can lean on it without re-creating it.
 */
export const accountName = (teachers, boys, u) => {
  const t = attachedTeacher(teachers, u)
  const b = attachedBoy(boys, u)
  return u?.display_name || t?.teacher_name || b?.boy_name || ''
}

/** What an account is attached to, as a readable line. */
export const linkedLabel = (teachers, boys, u, classLabel) => {
  if (!u) return '—'
  if (u.role === 'super_admin') return 'كل الفصول'
  if (u.teacher_id) {
    const t = teachers.find((x) => x.id === u.teacher_id)
    return t ? `${t.teacher_name} — ${classLabel(t.class_id)}` : `خادم #${u.teacher_id}`
  }
  if (u.boy_id) {
    const b = boys.find((x) => x.id === u.boy_id)
    return b ? `${b.boy_name} — ${classLabel(b.class_id)}` : `ولد #${u.boy_id}`
  }
  return '—'
}
