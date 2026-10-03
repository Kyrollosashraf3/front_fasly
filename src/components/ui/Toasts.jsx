import { useToast } from '../../context/ToastContext'

/** Renders the toast queue — mounted once, near the app root. */
export function Toasts() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="toast-root" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type !== 'info' ? `toast--${t.type}` : ''}`}>
          <span>{t.text}</span>
          <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="إغلاق">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
