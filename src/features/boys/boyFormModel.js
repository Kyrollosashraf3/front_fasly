import { SKILLS } from '../../lib/constants'

/** A boy is filed by three names: his own, his father's, his grandfather's. */
export const NAME_PARTS = ['', '', '']

/**
 * The three boxes a stored name opens into. Whatever is left after the
 * father's name stays in the third box, so a four-word name round-trips
 * exactly instead of losing a word.
 */
export const splitName = (value) => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  return [parts[0] ?? '', parts[1] ?? '', parts.slice(2).join(' ')]
}

export const joinName = (parts) =>
  parts.map((part) => String(part || '').trim().replace(/\s+/g, ' ')).filter(Boolean).join(' ')

export const EMPTY = {
  name_parts: NAME_PARTS,
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
  if (!boy)
    return {
      ...EMPTY,
      name_parts: [...NAME_PARTS],
      class_id: String(defaultClassId ?? classes[0]?.id ?? ''),
    }

  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, boy[k] ?? EMPTY[k]])),
    name_parts: splitName(boy.boy_name),
    class_id: String(boy.class_id),
    // The select stores strings, so normalise the servant id too — otherwise
    // the "is this servant still in the list?" check mistakes it for stale
    // and silently sends teacher_id: null (which drops him from his group).
    teacher_id: boy.teacher_id != null ? String(boy.teacher_id) : '',
    birth_date: boy.birth_date || '',
    skills: Array.isArray(boy.skills) ? boy.skills.filter((s) => SKILLS.includes(s)) : [],
    custom: Array.isArray(boy.skills)
      ? boy.skills.filter((s) => !SKILLS.includes(s)).join('، ')
      : '',
  }
}

/** Client-side validation; returns an errors object (empty when valid). */
export function validateBoy(form, isEdit = false) {
  const next = {}
  const parts = form.name_parts.map((part) => String(part || '').trim())
  if (!parts[0]) next.name_0 = 'اكتب اسم الولد.'
  // The three parts are what a new boy is filed by. A boy already on file may
  // keep the two-word name he was entered with years ago.
  if (!isEdit && !parts[1]) next.name_1 = 'اكتب اسم الأب.'
  if (!isEdit && !parts[2]) next.name_2 = 'اكتب اسم الجد.'
  if (!form.gender) next.gender = 'اختر النوع.'
  if (!form.class_id) next.class_id = 'اختر الفصل.'
  if (form.birth_date && form.birth_date > new Date().toISOString().slice(0, 10))
    next.birth_date = 'تاريخ الميلاد مش ممكن يكون في المستقبل.'
  return next
}

/** The API payload: string trims, numbers, and the explicit nulls PATCH needs. */
export function boyPayload(form) {
  const { custom, name_parts, ...rest } = form
  // The typed «أخرى» skill lives inside the same `skills` array.
  const customText = custom.trim()
  const skillsOut = [...form.skills]
  if (customText)
    skillsOut.push(...customText.split('،').map((s) => s.trim()).filter(Boolean))

  const payload = compact({
    ...rest,
    boy_name: joinName(name_parts),
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
