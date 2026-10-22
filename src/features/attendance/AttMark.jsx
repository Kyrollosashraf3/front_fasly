/**
 * AttMark — a labelled tick chip for one attendance fact.
 *
 * A bare checkbox gave no clue which box was «حضور» and which was «قداس», so
 * each fact now carries its own name. `type` picks the colour: green for the
 * Sunday-school attendance, gold for the mass.
 */
export function AttMark({ type, checked, onToggle, disabled }) {
  const conf =
    type === 'liturgy'
      ? { label: 'قداس', hint: 'حضر القداس' }
      : { label: 'حضور', hint: 'حضر مدارس الأحد' }

  return (
    <button
      type="button"
      className={`att-mark att-mark--${type}${checked ? ' is-on' : ''}`}
      aria-pressed={checked}
      aria-label={`${conf.hint}: ${checked ? 'نعم' : 'لا'}`}
      disabled={disabled}
      onClick={() => onToggle(!checked)}
    >
      <span className="att-mark__label">{conf.label}</span>
    </button>
  )
}
