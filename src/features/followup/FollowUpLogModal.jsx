import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { formatDate, todayISO } from '../../lib/format'
import { STATUS_OPTIONS } from './constants'

const TYPES = STATUS_OPTIONS.filter((o) => o.value)

/**
 * The quick «تسجيل افتقاد» card: day, servant (managers only), the way he was
 * reached as visible chips, and a note. Saving a boy who already has a log on
 * that day edits it instead of adding a duplicate.
 */
export function FollowUpLogModal({
  open,
  boy,
  defaultDate,
  defaultTeacher,
  teachers = [],
  canPickMentor = false,
  existing,
  loggedCount = 0,
  saving,
  onSave,
  onClose,
}) {
  const [date, setDate] = useState(defaultDate)
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [teacher, setTeacher] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(existing?.action_date || defaultDate)
    setStatus(existing?.status || '')
    setNote(existing?.note || '')
    setTeacher(String(existing?.teacher_id || defaultTeacher || ''))
  }, [open, boy?.id, existing?.id, defaultDate, defaultTeacher])

  if (!boy) return null

  const submit = async (e) => {
    e.preventDefault()
    if (!status) return
    const ok = await onSave(boy, {
      action_date: date,
      status,
      note: note.trim(),
      teacher_id: canPickMentor ? Number(teacher) || null : null,
    })
    if (ok) onClose()
  }

  const teacherName = teachers.find((t) => String(t.id) === String(teacher))?.teacher_name

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={boy.boy_name}
      sub={existing ? 'تعديل الافتقاد المسجّل' : 'تسجيل افتقاد جديد'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            form="followup-log-form"
            variant="primary"
            loading={saving}
            disabled={!status}
          >
            حفظ
          </Button>
        </>
      }
    >
      <form id="followup-log-form" onSubmit={submit} className="fu-form">
        <Field label="التاريخ" htmlFor="fu-date" required>
          <Input
            id="fu-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        {canPickMentor && !existing && (
          <Field label="الخادم" htmlFor="fu-teacher" hint="الخادم المسؤول عن الولد">
            <Select id="fu-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
              <option value="">— اختر الخادم —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacher_name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {existing && (
          <p className="small muted fu-form__meta">
            سجّله {teacherName || 'خادم'} في {formatDate(existing.action_date)}
          </p>
        )}

        {!existing && loggedCount > 0 && date === defaultDate && (
          <p className="small muted fu-form__meta">
            فيه {loggedCount} افتقاد مسجّل في اليوم ده — الحفظ هيضيف افتقاد جديد.
          </p>
        )}

        <Field label="طريقة الافتقاد" required>
          <div className="chips" role="group" aria-label="طريقة الافتقاد">
            {TYPES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`chip${status === o.value ? ' chip--on' : ''}`}
                aria-pressed={status === o.value}
                onClick={() => setStatus(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="ملاحظات" htmlFor="fu-note">
          <Textarea
            id="fu-note"
            rows={3}
            value={note}
            maxLength={500}
            placeholder="إيه اللي اتقال أو اتعمل؟"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}
