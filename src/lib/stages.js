import { normalizeSearch } from './search'

/**
 * stages.js — the stage buckets a class name falls into.
 *
 * Nothing lives in the database: a class belongs to a stage when its own name
 * carries one of the stage's words — «تالتة اعدادي» belongs to إعدادي, a
 * «حضانة» class to حضانة. The comparison runs through the same Arabic-aware
 * normalisation the search uses (ا/أ/إ, ى/ي, ة/ه… fold together), so the exact
 * spelling never matters. A name matching none of the five word sets counts
 * as «اخري», so a fresh name is never lost from the menus.
 */
export const STAGES = [
  { key: 'kg', label: 'حضانة', words: ['حضان'] },
  { key: 'primary', label: 'ابتدائي', words: ['ابتدائي'] },
  { key: 'prep', label: 'اعدادي', words: ['اعدادي'] },
  { key: 'secondary', label: 'ثانوي', words: ['ثانوي', 'ثانوية'] },
  { key: 'youth', label: 'شباب', words: ['شباب'] },
  { key: 'other', label: 'اخري', words: [] },
]

// The keywords, folded once to their canonical form (حضانة -> حضانه …).
const FOLDED = STAGES.map((stage) => ({
  key: stage.key,
  words: stage.words.map(normalizeSearch),
}))

/** Which stage bucket a class name belongs to ('other' when nothing matched). */
export function stageOf(className) {
  const name = normalizeSearch(className)
  for (const stage of FOLDED) {
    if (stage.words.some((word) => name.includes(word))) return stage.key
  }
  return 'other'
}

/** The classes whose name belongs to a stage key ('' = no filtering). */
export function classesForStage(classes, stageKey) {
  if (!stageKey) return classes
  return classes.filter((c) => stageOf(c?.name) === stageKey)
}
