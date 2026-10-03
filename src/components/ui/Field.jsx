/**
 * Form primitives. Screens compose them with <Field label="..." error={...}> so
 * label / required / hint / error markup is never hand-written twice.
 */

export function Field({ label, required, hint, error, htmlFor, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field__required">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  )
}

export function Input({ error, className = '', ...rest }) {
  return <input className={`input ${error ? 'is-error' : ''} ${className}`} {...rest} />
}

export function Textarea({ error, className = '', rows = 3, ...rest }) {
  return <textarea rows={rows} className={`textarea ${error ? 'is-error' : ''} ${className}`} {...rest} />
}

export function Select({ error, className = '', children, ...rest }) {
  return (
    <select className={`select ${error ? 'is-error' : ''} ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Checkbox({ label, ...rest }) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}

/** Debounce is applied by the caller (useDebounced) so this stays dumb. */
export function SearchInput({ value, onChange, placeholder = 'ابحث...', className = '' }) {
  return (
    <div className={`search-input ${className}`}>
      <span className="search-input__icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
