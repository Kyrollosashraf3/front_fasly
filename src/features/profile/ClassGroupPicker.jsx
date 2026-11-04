import { useMemo } from 'react'

/**
 * ClassGroupPicker — the classes a stage amin answers for, cut by stage.
 *
 * The stage is not stored anywhere: it is read off the class name, because the
 * fixed catalogue (lib/constants.js) is cut by stage. Tapping a stage title
 * takes the whole stage at once — رابعة لخمسة for one amin, أولى وتانية لسادسة
 * for the next — and a single class can still be added on its own.
 */

const STAGES = [
  { label: 'ابتدائي', matches: (name) => name.includes('ابتدائي') },
  { label: 'إعدادي', matches: (name) => name.includes('اعدادي') || name.includes('إعدادي') },
  { label: 'ثانوي', matches: (name) => name.includes('ثانوي') },
]

export function ClassGroupPicker({ classes = [], selected = [], onChange }) {
  /** The catalogue order keeps one stage's classes together and in school order. */
  const grouped = useMemo(() => {
    const rest = [...classes]
    const byStage = STAGES.map((stage) => {
      const rows = rest.filter((c) => stage.matches(c.name || ''))
      rows.forEach((row) => rest.splice(rest.indexOf(row), 1))
      return { ...stage, rows }
    })
    return rest.length ? [...byStage, { label: 'خدمة', rows: rest }] : byStage
  }, [classes])

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id])

  const toggleStage = (rows) => {
    const ids = rows.map((c) => c.id)
    const on = ids.every((id) => selected.includes(id))
    onChange(on ? selected.filter((v) => !ids.includes(v)) : [...selected, ...ids.filter((id) => !selected.includes(id))])
  }

  return (
    <div className="class-group">
      {grouped.map(({ label, rows }) =>
        rows.length ? (
          <div key={label} className="class-group__stage">
            <button
              type="button"
              className="class-group__title"
              onClick={() => toggleStage(rows)}
              aria-label={`اختيار مرحلة ${label} كلها`}
            >
              {label}
              <span className="small muted">
                {rows.filter((c) => selected.includes(c.id)).length}/{rows.length}
              </span>
            </button>
            <div className="chips">
              {rows.map((c) => {
                const on = selected.includes(c.id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`chip${on ? ' chip--on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(c.id)}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null,
      )}
    </div>
  )
}
