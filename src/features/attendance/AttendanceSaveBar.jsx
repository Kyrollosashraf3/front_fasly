import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

/** The floating save bar; reserves space on the phone for the fixed bar. */
export function AttendanceSaveBar({ sheet, canAdd, onAddBoy }) {
  const { allDone, unsaved, saving, save, counts, canWrite } = sheet
  if (!canWrite || counts.total === 0) return null

  return (
    <>
      <div className="att-savebar att-savebar--compact">
        {allDone && (
          <div className="summary-bar__stats">
            <span className="badge badge--gold">خلصت — الكل اتعلّم</span>
          </div>
        )}

        <div className="row" style={{ gap: 10 }}>
          {unsaved && <Badge kind="gold" dot>فيه تعديلات لمتحفظش</Badge>}
          {canAdd && (
            <Button
              variant="secondary"
              icon={<Icon name="plus" size={16} />}
              onClick={onAddBoy}
            >
              إضافة ولد
            </Button>
          )}
          <Button
            variant="accent"
            loading={saving}
            disabled={!unsaved}
            onClick={save}
            icon={<Icon name="check" size={16} />}
          >
            حفظ الحضور
          </Button>
        </div>
      </div>
      {/* reserves room for the fixed save bar on the phone */}
      <div className="att-savebar-space" aria-hidden="true" />
    </>
  )
}
