/**
 * constants.js — values the whole UI agrees on.
 *
 * CLASS_NAMES mirrors CLASS_NAMES in back_fasly/app/schemas/school_class.py:
 * the API rejects any other name, so the class dialog only ever offers these.
 */

export const CLASS_NAMES = [
  'أولي ابتدائي',
  'تانية ابتدائي',
  'تالتة ابتدائي',
  'رابعة ابتدائي',
  'خامسة ابتدائي',
  'سادسة ابتدائي',
  'أولي اعدادي',
  'تانية اعدادي',
  'تالتة اعدادي',
  'أولي ثانوي',
  'تانية ثانوي',
  'تالتة ثانوي',
  'شباب',
]

/** Egyptian mobile: 01xxxxxxxxx */
export const PHONE_PATTERN = /^01[0-9]{9}$/

/**
 * Mirrors FatherEnum / SkillEnum in back_fasly/app/models/enums.py - the API
 * rejects anything outside these lists, so the selects only offer them.
 */
export const FATHERS = [
  'ابونا كيرلس روماني',
  'ابونا ارسانيوس عزت',
  'ابونا فام عبدالمسيح',
]

export const SKILLS = [
  'تمثيل',
  'رسم',
  'تلوين',
  'عزف',
  'ديكور',
  'برمجة',
  'تصميم جرافيك',
  'اكسيل',
  'كمبيوتر',
  'تأليف',
  'أخرى',
]

export const isPhone = (value) => PHONE_PATTERN.test(normalisePhone(value || ''))

/** Strip the separators people type and fold +20 / 0020 down to a leading 0. */
export function normalisePhone(value) {
  const cleaned = String(value || '').trim().replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('+20')) return `0${cleaned.slice(3)}`
  if (cleaned.startsWith('0020')) return `0${cleaned.slice(4)}`
  return cleaned
}

/** How we greet a login: real name first, then the phone he signs in with. */
export const userLabel = (u) => u?.display_name || u?.phone || ''
