import { useEffect, useRef, useState } from 'react'
import { useDismiss } from '../../hooks'
import { Icon } from './Icon'

/**
 * FileMenu — a dropdown for the Excel actions (template / export / import)
 * so three buttons don't crowd every toolbar.
 *
 *   <FileMenu items={[
 *     { key:'template', label:'تنزيل نموذج', icon:'download', onClick },
 *     { key:'export',   label:'تصدير',        icon:'download', onClick },
 *     { key:'import',   label:'استيراد',      icon:'upload',   onClick },
 *   ]} />
 *
 * An item may be `hidden`. The import item should set `fileInput` to trigger
 * the hidden <input type=file> the parent renders.
 */
export function FileMenu({ label = 'إكسل', items = [], accept = '.xlsx,.xlsm' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)

  useDismiss(ref, () => setOpen(false), open)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const handle = (item) => {
    setOpen(false)
    if (item.fileInput) inputRef.current?.click()
    else item.onClick?.()
  }

  const visible = items.filter((i) => !i.hidden)

  return (
    <span className="file-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="list" />
        {label}
        <Icon name="chevronDown" size={13} />
      </button>

      {open && (
        <div className="file-menu__list" role="menu">
          {visible.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="file-menu__item"
              onClick={() => handle(item)}
            >
              <Icon name={item.icon || 'chevron'} size={15} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const importer = items.find((i) => i.fileInput)
          e.target.value = ''
          if (file) importer?.onFile?.(file)
        }}
      />
    </span>
  )
}
