import { Select } from './Field'
import { STAGES } from '../../lib/stages'

/**
 * The stage-line filter (حضانة … اخري) beside a class picker. Only the
 * church-wide amin sees it: a choice narrows the class menu to the classes
 * whose name carries the stage — «اعدادي» shows أولي اعدادي، تانية اعدادي،
 * تالتة اعدادي — and a fresh class name falls into its line without any
 * configuration.
 */
export function StageSelect({ value, onChange }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="select--plain"
      aria-label="اختيار المرحلة"
    >
      <option value="">كل المراحل</option>
      {STAGES.map((stage) => (
        <option key={stage.key} value={stage.key}>
          {stage.label}
        </option>
      ))}
    </Select>
  )
}
