import { Select } from './Field'

/**
 * ClassFilter — the super-admin's "which class?" picker, dropped into a global
 * module's toolbar. Pass `allLabel` to offer an aggregated "كل الفصول" (value
 * `''`); leave it out for sheets that always need one class.
 *
 * It renders the same plain select the performance dashboards already use, so
 * the control reads identically everywhere.
 */
export function ClassFilter({
  value,
  onChange,
  classes,
  allLabel,
  ariaLabel = 'اختيار الفصل',
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="select--plain"
      style={{ minWidth: 190 }}
      aria-label={ariaLabel}
      searchable
      searchPlaceholder="ابحث باسم الفصل..."
    >
      {allLabel !== undefined && <option value="">{allLabel}</option>}
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  )
}
