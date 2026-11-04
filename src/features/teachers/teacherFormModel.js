import { SKILLS } from '../../lib/constants'

export const EMPTY = {
  teacher_name: '',
  phone: '',
  phone_2: '',
  birth_date: '',
  zone: '',
  address: '',
  location: '',
  father_name: '',
  skills: [],
  custom: '',
  class_id: '',
  last_visit_date: '',
  note: '',
}

export const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )

/** Form values for a teacher (or a blank form) — also used as the dirty baseline. */
export function formStateFor(teacher, defaultClassId, classes) {
  if (!teacher) {
    return { ...EMPTY, class_id: String(defaultClassId ?? classes[0]?.id ?? '') }
  }
  return {
    teacher_name: teacher.teacher_name,
    phone: teacher.phone || '',
    phone_2: teacher.phone_2 || '',
    birth_date: teacher.birth_date || '',
    zone: teacher.zone || '',
    address: teacher.address || '',
    location: teacher.location || '',
    father_name: teacher.father_name || '',
    skills: Array.isArray(teacher.skills)
      ? teacher.skills.filter((s) => SKILLS.includes(s))
      : [],
    custom: Array.isArray(teacher.skills)
      ? teacher.skills.filter((s) => !SKILLS.includes(s)).join('، ')
      : '',
    class_id: teacher.class_id == null ? '' : String(teacher.class_id),
    last_visit_date: teacher.last_visit_date || '',
    note: teacher.note || '',
  }
}

/** Request body for create/update: blanks dropped, custom skills merged in. */
export function buildPayload(form) {
  const { custom, class_id, ...rest } = form
  // The typed «أخرى» skill lives inside the same `skills` array.
  const customText = custom.trim()
  const skillsOut = [...form.skills]
  if (customText)
    skillsOut.push(
      ...customText.split('،').map((s) => s.trim()).filter(Boolean),
    )

  const payload = compact({
    ...rest,
    teacher_name: form.teacher_name.trim(),
    last_visit_date: form.last_visit_date || null,
    note: form.note.trim(),
    phone: form.phone.trim(),
    phone_2: form.phone_2.trim(),
    zone: form.zone.trim(),
    address: form.address.trim(),
    location: form.location.trim(),
    skills: skillsOut,
  })
  // "" means "clear it" - PATCH only obeys an explicit null, and compact
  // would drop the key entirely.
  payload.father_name = form.father_name || null
  // A servant may sit outside every class: empty (or «بدون فصل») is sent as
  // null - the backend decides who is allowed that (super admin only).
  payload.class_id = class_id === '' ? null : Number(class_id)
  return payload
}
