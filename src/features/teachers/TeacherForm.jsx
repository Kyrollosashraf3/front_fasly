import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { TeacherAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'

const EMPTY = { teacher_name: '', phone: '', class_id: '', last_visit_date: '', note: '' }

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )

/** Create / edit one servant. Managers only. */
export function TeacherForm({ open, onClose, teacher, defaultClassId, onSaved }) {
  const { classes } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      teacher
        ? {
            teacher_name: teacher.teacher_name,
            phone: teacher.phone || '',
            class_id: String(teacher.class_id),
            last_visit_date: teacher.last_visit_date || '',
            note: teacher.note || '',
          }
        : { ...EMPTY, class_id: String(defaultClassId ?? classes[0]?.id ?? '') },
    )
  }, [open, teacher, defaultClassId, classes])

  const isEdit = Boolean(teacher)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.teacher_name.trim()) {
      setErrors({ teacher_name: 'اسم الخادم مطلوب.' })
      return
    }
    setBusy(true)
    const payload = compact({
      ...form,
      teacher_name: form.teacher_name.trim(),
      class_id: Number(form.class_id),
      last_visit_date: form.last_visit_date || null,
      note: form.note.trim(),
      phone: form.phone.trim(),
    })
    try {
      if (isEdit) await TeacherAPI.update(teacher.id, payload)
      else await TeacherAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل بيانات الخادم.' : 'تمت إضافة الخادم.')
      onClose()
      onSaved?.()
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length)
        setErrors(err.fields)
      else toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات الخادم' : 'إضافة خادم جديد'}
      sub={isEdit ? teacher.teacher_name : 'الخدمات المسندة للفصل'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="اسم الخادم" required htmlFor="t-name" error={errors.teacher_name}>
          <Input
            id="t-name"
            placeholder="مثال: أ. مينا عادل"
            value={form.teacher_name}
            error={errors.teacher_name}
            onChange={set('teacher_name')}
          />
        </Field>

        <div className="grid-2">
          <Field label="التليفون" htmlFor="t-phone">
            <Input id="t-phone" dir="ltr" placeholder="01012345678" value={form.phone} onChange={set('phone')} />
          </Field>

          <Field label="الفصل" required htmlFor="t-class">
            <Select id="t-class" value={form.class_id} onChange={set('class_id')}>
              <option value="">— اختر الفصل —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="آخر اعتراف / زيارة للأب" htmlFor="t-visit">
            <Input
              id="t-visit"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.last_visit_date}
              onChange={set('last_visit_date')}
            />
          </Field>
        </div>

        <Field label="ملاحظات" htmlFor="t-note">
          <Textarea
            id="t-note"
            rows={3}
            maxLength={500}
            placeholder="دور الخادم، ملاحظات عنه..."
            value={form.note}
            onChange={set('note')}
          />
        </Field>

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
