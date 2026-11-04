import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useModal } from '../../context/ModalContext'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field, Input, Select } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { TaskAPI } from '../../lib/endpoints'
import { todayISO } from '../../lib/format'

/**
 * TaskDialog — open a competition or edit an existing one.
 *
 * The parent mounts it only while open and keys it by the edited task, so the
 * form always starts from the right values. Servants and amins of a single
 * class are pinned to that class; an amin who answers for several picks which
 * one the competition is for.
 */
export function TaskDialog({ task, classes, canChooseClass, onClose, onSaved }) {
  const toast = useToast()
  const modal = useModal()
  const isEdit = Boolean(task)

  const forcedClassId = String(classes[0]?.id ?? '')
  const [form, setForm] = useState({
    task_name: task?.task_name ?? '',
    value: task ? String(task.value ?? '') : '50',
    class_id: canChooseClass ? String(task?.class_id ?? classes[0]?.id ?? '') : forcedClassId,
    created_at: task?.created_at || todayISO(),
    status: task?.status ?? 'active',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const next = {}
    if (!form.task_name.trim()) next.task_name = 'اكتب اسم المسابقة.'
    const value = Number(form.value)
    if (!Number.isInteger(value) || value < 0) next.value = 'أدخل عدد طايو صحيحًا.'
    if (canChooseClass && !form.class_id) next.class_id = 'اختر الفصل.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    const payload = {
      task_name: form.task_name.trim(),
      value: Number(form.value),
      class_id: Number(canChooseClass ? form.class_id : forcedClassId),
      created_at: form.created_at || undefined,
    }
    // Status is only editable on an existing task; a new one always starts active.
    if (isEdit) payload.status = form.status
    try {
      if (isEdit) await TaskAPI.update(task.id, payload)
      else await TaskAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل المسابقة.' : 'تمت إضافة المسابقة.')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const ok = await modal.confirm({
      title: `حذف "${task.task_name}"؟`,
      message: 'فيها تسميعات مسجّلة؟ السيرفر هيرفض الحذف حتى يتسجل الحذف الأول.',
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await TaskAPI.remove(task.id)
      toast.success('تم حذف المسابقة.')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'تعديل المسابقة' : 'إضافة مسابقة جديدة'}
      sub={isEdit ? task.task_name : 'الاسم وقيمة الطايو والفصل وتاريخ التسجيل'}
      footer={
        <>
          {isEdit && (
            <Button variant="danger" onClick={remove} style={{ marginInlineEnd: 'auto' }}>
              <Icon name="trash" size={15} />
              حذف
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" type="submit" form="task-form" loading={busy}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة المسابقة'}
          </Button>
        </>
      }
    >
      <form id="task-form" className="stack" onSubmit={submit} noValidate>
        <Field label="اسم المسابقة" required htmlFor="task-name" error={errors.task_name}>
          <Input
            id="task-name"
            placeholder="مثال: حفظ اصحاح 4 من انجيل مرقس"
            value={form.task_name}
            error={errors.task_name}
            onChange={set('task_name')}
          />
        </Field>

        <Field
          label="قيمة الطايو"
          required
          htmlFor="task-value"
          error={errors.value}
          hint="عدد الطايو اللي بيستاهلها الولد لما يسمّع."
        >
          <Input
            id="task-value"
            type="number"
            min="0"
            step="1"
            dir="ltr"
            value={form.value}
            error={errors.value}
            onChange={set('value')}
          />
        </Field>

        {canChooseClass ? (
          <Field label="الفصل" required htmlFor="task-class" error={errors.class_id}>
            <Select
              id="task-class"
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
          <Field label="الفصل" htmlFor="task-class">
            <span className="field__value">{classes[0]?.name || '—'}</span>
          </Field>
        )}

        {isEdit && (
          <Field
            label="حالة المسابقة"
            htmlFor="task-status"
            hint="ACTIVE تظهر ضمن مسابقاتك النشطة، وINACTIVE تنقلها إلى المسابقات القديمة."
          >
            <div className="tasks__status">
              <Select id="task-status" value={form.status} onChange={set('status')}>
                <option value="active">ACTIVE — مسابقة نشطة</option>
                <option value="inactive">INACTIVE — مسابقة قديمة</option>
              </Select>
              <Badge kind={form.status === 'inactive' ? 'neutral' : 'green'}>
                {String(form.status).toUpperCase()}
              </Badge>
            </div>
          </Field>
        )}

        <Field label="تاريخ التسجيل" htmlFor="task-date">
          <Input id="task-date" type="date" value={form.created_at} onChange={set('created_at')} />
        </Field>
      </form>
    </Modal>
  )
}
