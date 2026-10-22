import { SKILLS } from '../../lib/constants'

export const EMPTY = {
  boy_name: '',
  // No default: the type (ولد/بنت) must be picked explicitly on a new boy.
  gender: '',
  class_id: '',
  teacher_id: '',
  birth_date: '',
  phone: '',
  phone_2: '',
  zone: '',
  address: '',
  location: '',
  father_name: '',
  national_id: '',
  skills: [],
  custom: '',
  last_visit_date: '',
  note: '',
  issue_flag: false,
}

/** Strip blanks so PATCH sends only what actually changed. */
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )

/** The form state a boy's record maps onto (or a blank one for a new boy). */
export function formStateFor(boy, defaultClassId, classes) {
  if (!boy) return { ...EMPTY, class_id: String(defaultClassId ?? classes[0]?.id ?? '') }

  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, boy[k] ?? EMPTY[k]])),
    class_id: String(boy.class_id),
    birth_date: boy.birth_date || '',
    skills: Array.isArray(boy.skills) ? boy.skills.filter((s) => SKILLS.includes(s)) : [],
    custom: Array.isArray(boy.skills)
      ? boy.skills.filter((s) => !SKILLS.includes(s)).join('، ')
      : '',
  }
}

/** Client-side validation; returns an errors object (empty when valid). */
export function validateBoy(form) {
  const next = {}
  if (!form.boy_name.trim()) next.boy_name = 'اسم الولد مطلوب.'
  if (!form.gender) next.gender = 'اختر النوع.'
  if (!form.class_id) next.class_id = 'اختر الفصل.'
  if (form.birth_date && form.birth_date > new Date().toISOString().slice(0, 10))
    next.birth_date = 'تاريخ الميلاد مش ممكن يكون في المستقبل.'
  return next
}

/** The API payload: string trims, numbers, and the explicit nulls PATCH needs. */
export function boyPayload(form) {
  const { custom, ...rest } = form
  // The typed «أخرى» skill lives inside the same `skills` array.
  const customText = custom.trim()
  const skillsOut = [...form.skills]
  if (customText)
    skillsOut.push(...customText.split('،').map((s) => s.trim()).filter(Boolean))

  const payload = compact({
    ...rest,
    boy_name: form.boy_name.trim(),
    class_id: Number(form.class_id),
    birth_date: form.birth_date || null,
    last_visit_date: form.last_visit_date || null,
    phone: form.phone.trim(),
    phone_2: form.phone_2.trim(),
    zone: form.zone.trim(),
    address: form.address.trim(),
    location: form.location.trim(),
    national_id: form.national_id.trim(),
    note: form.note.trim(),
    skills: skillsOut,
  })
  // Kept out of `compact` on purpose: `null` means "no servant", which is a
  // real instruction when editing (it unfiles him from his group).
  payload.teacher_id = form.teacher_id ? Number(form.teacher_id) : null
  // Same for the optional enums: "" means "clear it", and PATCH only
  // obeys an explicit null.
  payload.father_name = form.father_name || null
  return payload
}
