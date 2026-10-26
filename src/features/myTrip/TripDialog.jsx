import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { TripAPI } from '../../lib/endpoints'
import { todayISO } from '../../lib/format'

/**
 * TripDialog — create a trip or edit an existing one.
 *
 * The parent mounts it only while open and keys it by the edited trip, so the
 * form always starts from the right values (a new trip vs. the one clicked).
 * Servants and class amins are pinned to their own class; a super admin picks.
 */
export function TripDialog({ trip, classes, canChooseClass, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = Boolean(trip)

  const forcedClassId = String(classes[0]?.id ?? '')
  const [form, setForm] = useState({
    name: trip?.name ?? '',
    cost: trip ? String(trip.cost ?? '') : '',
    class_id: canChooseClass ? String(trip?.class_id ?? classes[0]?.id ?? '') : forcedClassId,
    created_at: trip?.created_at || todayISO(),
    status: trip?.status ?? 'active',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'اكتب اسم الرحلة.'
    const cost = Number(form.cost)
    if (!Number.isFinite(cost) || cost < 0) next.cost = 'أدخل قيمة صحيحة.'
    if (canChooseClass && !form.class_id) next.class_id = 'اختر الفصل.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      cost: Number(form.cost),
      class_id: Number(canChooseClass ? form.class_id : forcedClassId),
      created_at: form.created_at || undefined,
    }
    // Status is only editable on an existing trip; a new one always starts active.
    if (isEdit) payload.status = form.status
    try {
      if (isEdit) await TripAPI.update(trip.id, payload)
      else await TripAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل الرحلة.' : 'تمت إضافة الرحلة.')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'تعديل الرحلة' : 'إضافة رحلة جديدة'}
      sub={isEdit ? trip.name : 'الاسم والقيمة والفصل وتاريخ التسجيل'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" type="submit" form="trip-form" loading={busy}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة الرحلة'}
          </Button>
        </>
      }
    >
      <form id="trip-form" className="stack" onSubmit={submit} noValidate>
        <Field label="اسم الرحلة" required htmlFor="trip-name" error={errors.name}>
          <Input id="trip-name" value={form.name} error={errors.name} onChange={set('name')} />
        </Field>

        <Field label="قيمة الاشتراك (جنيه)" required htmlFor="trip-cost" error={errors.cost}>
          <Input
            id="trip-cost"
            type="number"
            min="0"
            step="any"
            dir="ltr"
            value={form.cost}
            error={errors.cost}
            onChange={set('cost')}
          />
        </Field>

        {canChooseClass ? (
          <Field label="الفصل" required htmlFor="trip-class" error={errors.class_id}>
            <Select
              id="trip-class"
              value={form.class_id}
              error={errors.class_id}
              onChange={set('class_id')}
              searchable
              searchPlaceholder="ابحث باسم الفصل..."
            >
              <option value="">— اختر الفصل —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="الفصل" htmlFor="trip-class">
            <span className="field__value">{classes[0]?.name || '—'}</span>
          </Field>
        )}

        {isEdit && (
          <Field
            label="حالة الرحلة"
            htmlFor="trip-status"
            hint="ACTIVE تظهر ضمن رحلاتك النشطة، وINACTIVE تنقلها إلى الرحلات القديمة."
          >
            <div className="mytrip__status">
              <Select id="trip-status" value={form.status} onChange={set('status')}>
                <option value="active">ACTIVE — رحلة نشطة</option>
                <option value="inactive">INACTIVE — رحلة قديمة</option>
              </Select>
              <Badge kind={form.status === 'inactive' ? 'neutral' : 'green'}>
                {String(form.status).toUpperCase()}
              </Badge>
            </div>
          </Field>
        )}

        <Field label="تاريخ التسجيل" htmlFor="trip-date">
          <Input id="trip-date" type="date" value={form.created_at} onChange={set('created_at')} />
        </Field>
      </form>
    </Modal>
  )
}
