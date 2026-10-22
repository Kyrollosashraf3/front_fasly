import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

/** The floating save bar; reserves space on the phone for the fixed bar. */
export function AttendanceSaveBar({ sheet, canWrite, canAdd, onAddBoy }) {
  const { allDone, unsaved, saving, save, counts } = sheet
  if (!canWrite && !canAdd) return null

  return (
    <>
      <div className="att-savebar att-savebar--floating att-savebar--compact">
        {canWrite && allDone && (counts.total > 0 || unsaved) && (
          <div className="summary-bar__stats">
            <span className="badge badge--gold">خلصت — الكل اتعلّم</span>
          </div>
        )}

        <div className="att-savebar__actions">
          {canAdd && (
            <Button
              variant="secondary"
              size="sm"
              className="att-fab"
              icon={<Icon name="plus" size={16} />}
              onClick={onAddBoy}
              title="إضافة ولد"
              aria-label="إضافة ولد"
            >
              <span className="att-fab__label">إضافة ولد</span>
            </Button>
          )}
          {canWrite && (
            <Button
              variant="accent"
              size="sm"
              className="att-fab att-fab--save"
              loading={saving}
              disabled={!unsaved}
              onClick={save}
              icon={<Icon name="check" size={16} />}
              title="حفظ الحضور"
              aria-label="حفظ الحضور"
            >
              <span className="att-fab__label">حفظ الحضور</span>
            </Button>
          )}
          {canWrite && unsaved && !saving && (
            <span className="att-fab__dot" aria-hidden="true" />
          )}
        </div>
      </div>
      {/* reserves room for the floating save bar */}
      <div className="att-savebar-space" aria-hidden="true" />
    </>
  )
}
