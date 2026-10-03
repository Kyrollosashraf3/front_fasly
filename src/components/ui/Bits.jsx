/**
 * ConfirmDialog helpers live in ModalContext; this file only holds small
 * presentational pieces shared across features.
 */

/** Detail row used in every read-only profile modal. */
export function DetailRow({ label, children }) {
  return (
    <div className="detail-row">
      <div className="detail-row__label">{label}</div>
      <div className="detail-row__value">{children ?? '—'}</div>
    </div>
  )
}

/** Pill showing a 0-100 score (attendance %, servant points). */
export function ScorePill({ value, suffix = '%' }) {
  return <span className="score-pill">{value ?? 0}{suffix}</span>
}

/** Section heading with the gold underline. */
export function SectionTitle({ children, action }) {
  return (
    <div className="section-title">
      <span>{children}</span>
      {action && <span style={{ marginInlineStart: 'auto' }}>{action}</span>}
    </div>
  )
}
