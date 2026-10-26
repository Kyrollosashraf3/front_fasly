import { Children, isValidElement } from 'react'
import { SearchSelect } from './SearchSelect'

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

const optionText = (children) => {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(optionText).join('')
  return ''
}

/** Read a plain `<option>` tree into the `{ value, label, hint }` shape SearchSelect wants. */
function readOptions(children) {
  const options = []
  let emptyLabel

  const walk = (nodes) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return
      if (child.type === 'option') {
        const value = child.props.value ?? ''
        const label = optionText(child.props.children)
        // The blank option is the control's placeholder, not a choice of its own.
        if (value === '' && emptyLabel === undefined) {
          emptyLabel = label
          return
        }
        if (child.props.disabled) return
        options.push({ value, label, hint: child.props['data-hint'] })
        return
      }
      // <optgroup> (or any wrapper) — keep looking for options inside it.
      if (child.props?.children) walk(child.props.children)
    })
  }

  walk(children)
  return { options, emptyLabel }
}

/**
 * Select — native by default, or a typed picker with `searchable`.
 *
 * `searchable` keeps the existing call-site contract: it still takes
 * `<option>` children and `onChange` still receives `{ target: { value } }`,
 * so long boy / class / servant lists become filterable without touching a
 * single form handler.
 */
export function Select({
  error,
  className = '',
  children,
  searchable = false,
  searchPlaceholder,
  placeholder,
  ...rest
}) {
  if (!searchable) {
    return (
      <select className={`select ${error ? 'is-error' : ''} ${className}`} {...rest}>
        {children}
      </select>
    )
  }

  const { value, onChange, id, name, style, disabled } = rest
  const { options, emptyLabel } = readOptions(children)

  return (
    <SearchSelect
      id={id}
      name={name}
      value={value ?? ''}
      onChange={(next) => {
        onChange?.({
          target: { value: next, name },
          currentTarget: { value: next, name },
        })
      }}
      options={options}
      placeholder={placeholder ?? emptyLabel ?? 'اختار...'}
      searchPlaceholder={searchPlaceholder ?? 'ابحث...'}
      ariaLabel={rest['aria-label']}
      disabled={disabled}
      error={error}
      className={className}
      style={style}
    />
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

/** Multi-select as toggle chips - pick as many as you need. */
export function ChipSelect({ options, value = [], onChange, ariaLabel }) {
  const toggle = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  return (
    <div className="chips" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const on = value.includes(opt)
        return (
          <button
            type="button"
            key={opt}
            className={`chip${on ? ' chip--on' : ''}`}
            aria-pressed={on}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        )
      })}
    </div>
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
