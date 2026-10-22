import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDismiss } from '../../hooks'
import { normalizeSearch } from '../../lib/search'
import { Icon } from './Icon'

/**
 * SearchSelect — a select you can type into.
 *
 *   <SearchSelect
 *     value={classId}
 *     onChange={setClassId}
 *     options={classes.map((c) => ({ value: c.id, label: c.name }))}
 *     placeholder="اختار الفصل"
 *   />
 *
 * The closed control shows the chosen label; focusing it clears the search so
 * the full list is browsable. Options may carry a small `hint` (e.g. the boy's
 * group) shown under the label. Typing filters with the same Arabic-aware
 * normaliser the rest of the app uses.
 */
export function SearchSelect({
  value,
  onChange,
  options = [],
  placeholder = 'اختار...',
  searchPlaceholder = 'ابحث...',
  ariaLabel,
  disabled = false,
  className = '',
  style,
  clearable = true,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const activeRef = useRef(null)

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return options
    return options.filter(
      (o) =>
        normalizeSearch(o.label).includes(q) ||
        (o.hint && normalizeSearch(o.hint).includes(q)),
    )
  }, [options, query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useDismiss(rootRef, close, open)

  useEffect(() => {
    if (!open) return
    setActive(0)
  }, [open, query])

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const openMenu = () => {
    if (disabled || open) return
    setOpen(true)
    setQuery('')
  }

  const choose = (option) => {
    onChange?.(String(option.value))
    close()
    inputRef.current?.blur()
  }

  const clear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onChange?.('')
    close()
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      setOpen(true)
      setQuery('')
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[active]) choose(filtered[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  const onBlur = (e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) close()
  }

  return (
    <div
      ref={rootRef}
      className={`search-select ${className}`.trim()}
      style={style}
    >
      <span className="search-select__icon" aria-hidden="true">
        <Icon name="search" size={15} />
      </span>
      <input
        ref={inputRef}
        type="text"
        className="input search-select__input"
        role="combobox"
        aria-label={ariaLabel || placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={open ? query : selected?.label || ''}
        placeholder={
          open
            ? selected
              ? `الحالي: ${selected.label}`
              : searchPlaceholder
            : placeholder
        }
        onFocus={openMenu}
        onClick={openMenu}
        onChange={(e) => {
          setOpen(true)
          setQuery(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      {clearable && (value !== '' && value !== null && value !== undefined) ? (
        <button
          type="button"
          className="search-select__clear"
          aria-label="مسح الاختيار"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={clear}
        >
          <Icon name="close" size={13} />
        </button>
      ) : (
        <span className="search-select__chevron" aria-hidden="true">
          <Icon name="chevronDown" size={14} />
        </span>
      )}

      {open && (
        <div className="search-select__menu" role="listbox" aria-label={ariaLabel}>
          {filtered.length === 0 ? (
            <div className="search-select__empty">مفيش نتائج</div>
          ) : (
            filtered.map((option, i) => {
              const isSelected = String(option.value) === String(value)
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  ref={i === active ? activeRef : null}
                  className={[
                    'search-select__option',
                    i === active ? 'is-active' : '',
                    isSelected ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(option)}
                >
                  <span className="search-select__label truncate">{option.label}</span>
                  {option.hint && (
                    <span className="search-select__hint truncate">{option.hint}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
