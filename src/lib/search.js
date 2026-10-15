/* eslint-disable no-misleading-character-class -- we match Arabic combining
   marks (tashkeel) on purpose, which is exactly what this rule warns about. */
/**
 * Arabic-aware search normalisation.
 *
 * People type the same name many different ways: أ / إ / آ / ا, ي / ى, ة / ه,
 * ڤ / ف, چ / ج, with or without tashkeel or tatweel. Search should not care, so
 * everything is folded to one canonical form before comparing.
 *
 *   const q = normalizeSearch(debounced)
 *   rows.filter((b) => normalizeSearch(b.boy_name).includes(q))
 */

// Tatweel (ـ) + the tashkeel / Quranic marks that carry no lexical weight.
const DIACRITICS = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g

// Letter variants folded onto a single base letter.
const VARIANTS = [
  [/[\u0622\u0623\u0625\u0627\u0671\u0672\u0673\u0675]/g, '\u0627'], // آأإاٱ -> ا
  [/[\u0649\u064A\u0626\u06CC\u06D0\u06D1]/g, '\u064A'], // ىيئ -> ي
  [/\u0629/g, '\u0647'], // ة -> ه
  [/\u0624/g, '\u0648'], // ؤ -> و
  [/[\u06A9\u06AA\u06AB]/g, '\u0643'], // ککګ -> ك
  [/[\u06A4\u06A5]/g, '\u0641'], // ڤڅ -> ف
  [/[\u0686\u0687]/g, '\u062C'], // چڇ -> ج
  [/[\u06BE\u06C0\u06C1\u06C2\u06D5]/g, '\u0647'], // ھہ -> ه
]

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g

/** Fold a value to its canonical, comparable search form. */
export function normalizeSearch(value) {
  let s = String(value ?? '').replace(DIACRITICS, '')
  for (const [pattern, base] of VARIANTS) s = s.replace(pattern, base)
  s = s
    .replace(ARABIC_DIGITS, (d) => {
      const code = d.charCodeAt(0)
      return String(code <= 0x0669 ? code - 0x0660 : code - 0x06F0)
    })
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return s
}
