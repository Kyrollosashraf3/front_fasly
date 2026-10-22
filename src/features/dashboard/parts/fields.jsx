import { Select } from '../../../components/ui/Field'

export const shortDate = (iso) => {
  const p = String(iso || '').split('-')
  return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}` : String(iso || '')
}

/** "عدد الجمع: [n]" dropdown, bound to a `useN` setter. */
export function NField({ label, value, onChange, from = 1, to = 12 }) {
  const options = []
  for (let i = from; i <= to; i += 1) options.push(i)
  return (
    <label className="n-field">
      {label}
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 78 }}>
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
    </label>
  )
}

/** The period every follow-up / confession section is measured over. */
export const PERIOD_OPTIONS = [
  { value: 7, label: 'آخر أسبوع' },
  { value: 30, label: 'آخر شهر' },
  { value: 90, label: 'آخر 3 شهور' },
]

export function PeriodField({ value, onChange }) {
  return (
    <label className="n-field">
      الفترة
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 132 }}>
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  )
}

/**
 * The date window the whole dashboard is measured over:
 * last Friday (default) / the whole history / the current church year.
 * Mirrors the backend's `date_mode` query values.
 */
export const DATE_MODE_OPTIONS = [
  { value: 'last_friday', label: 'آخر جمعة' },
  { value: 'all', label: 'كل الفترة' },
  { value: 'season', label: 'من بداية السنة الكنسية' },
]

export function DateModeField({ value, onChange }) {
  return (
    <label className="n-field">
      الفترة
      <Select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 190 }}>
        {DATE_MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  )
}
