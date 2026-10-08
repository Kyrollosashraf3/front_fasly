import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { AttendAPI } from '../../lib/endpoints'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { formatDate } from '../../lib/format'

/**
 * AttendEditDialog — the "✎ تعديل الغياب" marker.
 *
 * Once a Friday sheet is saved, every boy has a stored row; this dialog edits
 * that one row on its own (PATCH /attendance/{id}) instead of pushing the whole
 * class through the bulk save again — so "the boy was marked absent and I want
 * him present" is a two-tap job.
 *
 *   <AttendEditMarker boy={row} record={savedRow} date="2026-10-02" onSaved={refetch} />
 */
export function AttendEditDialog({ open, boy, record, date, onClose, onSaved }) {
  const toast = useToast()
  const [present, setPresent] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setPresent(Boolean(record?.present))
    setNote(record?.note || '')
  }, [open, record])

  const save = async () => {
    setBusy(true)
    try {
      await AttendAPI.update(record.id, { present, note: note.trim() || null })
      toast.success(
        present ? `${boy.boy_name} اتسجّل حاضر.` : `${boy.boy_name} اتسجّل غائب.`,
      )
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`تعديل حضور — ${boy.boy_name}`}
      sub={formatDate(date)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant={present ? 'primary' : 'secondary'}
            loading={busy}
            onClick={save}
            icon={<Icon name="check" size={16} />}
          >
            حفظ التعديل
          </Button>
        </>
      }
    >
      <div className="stack">
        <button
          type="button"
          className={`att-toggle ${present ? 'is-present' : 'is-absent'}`}
          aria-pressed={present}
          onClick={() => setPresent((v) => !v)}
        >
          <Icon name={present ? 'check' : 'close'} size={18} />
          <span className="att-toggle__label">{present ? 'حاضر' : 'غائب'}</span>
          <span className="att-toggle__hint">اضغط للتبديل</span>
        </button>

        <label className="field">
          <span className="field__label">ملاحظة</span>
          <Textarea
            rows={3}
            maxLength={500}
            placeholder="سبب الغياب أو أي ملاحظة"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  )
}

/** The ✎ marker + its dialog. Renders nothing when the row is not saved yet. */
export function AttendEditMarker({ boy, record, date, onSaved }) {
  const [open, setOpen] = useState(false)
  if (!record) return null

  return (
    <>
      <button
        type="button"
        className="att-edit"
        title={`تعديل حضور ${boy.boy_name} — ${formatDate(date)}`}
        aria-label={`تعديل حضور ${boy.boy_name}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="edit" size={13} />
        <span>تعديل</span>
      </button>

      {open && (
        <AttendEditDialog
          open
          boy={boy}
          record={record}
          date={date}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  )
}