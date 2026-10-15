import { useEffect, useRef } from 'react'

/**
 * Modal — the shared dialog shell.
 *
 * Two usages:
 *   <Modal open title onClose footer>{body}</Modal>     // controlled, you render
 *   <Modal config={c} onClose={fn} />                  // from ModalContext
 *           (config = { type: 'confirm' | 'prompt' | custom props })
 */
export function Modal({ open = true, title, sub, size, onClose, children, footer, headExtra }) {
  const panelRef = useRef(null)
  // `onClose` is usually an inline arrow, so it changes identity on every
  // parent render. Keep it in a ref so the effect below only runs when the
  // modal actually opens — otherwise each keystroke re-focused the first
  // element in the dialog (the ✕ close button), stealing the caret.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.()
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        // Enter submits the form when one is open inside the modal.
        const form = panelRef.current?.querySelector('form')
        if (form && e.target.form === form) {
          e.preventDefault()
          form.requestSubmit()
        }
      }
    }
    document.addEventListener('keydown', onKey)

    // First real field, never the header ✕ button.
    const first = panelRef.current?.querySelector(
      'input:not([type=hidden]), select, textarea',
    )
    first?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open) return null

  const cls = ['modal', size === 'lg' && 'modal--lg', size === 'sm' && 'modal--sm']
    .filter(Boolean)
    .join(' ')

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cls} ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal__head">
            <div>
              <div className="modal__title">{title}</div>
              {sub && <div className="modal__sub">{sub}</div>}
            </div>
            {headExtra}
            <button type="button" className="modal__close" onClick={() => onClose?.()} aria-label="إغلاق">
              ✕
            </button>
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ confirm */
function ConfirmView({ config, onClose }) {
  const { title, message, confirmLabel = 'تأكيد', kind = 'danger', onConfirm } = config
  const confirm = async () => {
    const result = onConfirm ? await onConfirm() : true
    onClose(result === undefined ? true : result)
  }
  return (
    <Modal
      size="sm"
      title={title}
      onClose={() => onClose(false)}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            إلغاء
          </button>
          <button
            type="button"
            className={`btn ${kind === 'danger' ? 'btn-solid-danger' : 'btn-primary'}`}
            onClick={confirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {message && <p className="muted">{message}</p>}
    </Modal>
  )
}

/* ------------------------------------------------------------------- prompt */
function PromptView({ config, onClose }) {
  const { title, value = '', label = 'ملاحظة', rows = 4, maxLength = 500 } = config
  const ref = useRef(value)

  const submit = (e) => {
    e.preventDefault()
    onClose(ref.current ?? '')
  }

  return (
    <Modal
      title={title}
      onClose={() => onClose(null)}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onClose(null)}>
            إلغاء
          </button>
          <button type="submit" form="prompt-form" className="btn btn-primary">
            حفظ
          </button>
        </>
      }
    >
      <form id="prompt-form" onSubmit={submit}>
        <div className="field">
          <label className="field__label" htmlFor="prompt-input">
            {label}
          </label>
          <textarea
            id="prompt-input"
            className="textarea"
            rows={rows}
            maxLength={maxLength}
            defaultValue={value}
            onChange={(e) => {
              ref.current = e.target.value
            }}
          />
          <span className="field__hint">
            {maxLength} حرف كحد أقصى
          </span>
        </div>
      </form>
    </Modal>
  )
}

/** Dispatcher used by ModalContext — keeps the context free of JSX logic. */
export function ModalHost({ config, onClose }) {
  if (config.type === 'confirm') return <ConfirmView config={config} onClose={onClose} />
  if (config.type === 'prompt') return <PromptView config={config} onClose={onClose} />
  // A custom config supplies its own render prop or children.
  return typeof config.render === 'function' ? config.render({ close: onClose }) : null
}
