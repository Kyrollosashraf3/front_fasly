import { initials } from '../../lib/format'

/** Avatar — initials in a navy (or gold) disc. */
export function Avatar({ name, size = 'md', gold = false }) {
  return (
    <span
      className={`avatar avatar--${size} ${gold ? 'avatar--gold' : ''}`}
      aria-hidden="true"
      title={name}
    >
      {initials(name)}
    </span>
  )
}

/** Progress bar with an optional label. */
export function Progress({ value = 0, max = 100, dark = false, label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className={`progress ${dark ? 'progress--dark' : ''} grow`}>
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {label !== undefined && <span className="small bold nowrap">{label}</span>}
    </div>
  )
}
