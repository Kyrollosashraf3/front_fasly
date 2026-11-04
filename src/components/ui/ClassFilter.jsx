import { Select } from './Field'

/**
 * ClassFilter — the multi-class login's "which class?" picker, dropped into a
 * global module's toolbar. Pass `allLabel` to offer the aggregated choice
 * (value `''`) — "كل الفصول" for a super admin, "فصولي" for a stage amin;
 * leave it out for sheets that always need one class.
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
