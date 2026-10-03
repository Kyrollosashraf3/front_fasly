import { Icon } from './Icon'

/** Full-page / section loading indicator. */
export function Loading({ label = 'جارٍ التحميل...' }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  )

}

/** Shimmering placeholder rows while a table loads. */
export function SkeletonRows({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}>
                  <div className="skeleton" style={{ height: 14, width: c === 0 ? '70%' : '50%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Friendly empty state — icon, title, message, optional call to action. */
export function EmptyState({ icon = 'inbox', title, message, action, inline }) {
  return (
    <div className={`state-block ${inline ? 'state-block--inline' : ''}`}>
      <div className="state-block__icon">
        <Icon name={icon} size={28} />
      </div>
      <div className="state-block__title">{title}</div>
      {message && <div className="state-block__msg">{message}</div>}
      {action}
    </div>
  )
}

/** Error state with a retry button — understands ApiError messages. */
export function ErrorState({ error, onRetry, title = 'حدث خطأ' }) {
  const message =
    typeof error === 'string' ? error : error?.message || 'تعذر تحميل البيانات. حاول مرة أخرى.'
  return (
    <div className="state-block state-block--error">
      <div className="state-block__icon">
        <Icon name="alert" size={28} />
      </div>
      <div className="state-block__title">{title}</div>
      <div className="state-block__msg">{message}</div>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <Icon name="refresh" />
          حاول مجددًا
        </button>
      )}
    </div>
  )
}
