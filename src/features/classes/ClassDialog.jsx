import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { ClassAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'

const EMPTY = { name: '', grade_number: 1, academic_year: '' }

const defaultYear = () => {
  const now = new Date()
  const start = now.getMonth() >= 8 ? now.year : now.year - 1
  return `${start}/${start + 1}`
}

/**
 * ClassDialog — create (and, from the home grid, rename/delete) a class.
 * Managers only; the API is the final say.
 *
 *   <ClassDialog />                                  → "إضافة فصل"
 *   <ClassDialog class={cls} trigger="icon" />       → edit pencil
 */
export function ClassDialog({ class: klass, onSaved, trigger = 'button' }) {
  const { isSuperAdmin, refreshClasses } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(
    klass
      ? { name: klass.name, grade_number: klass.grade_number, academic_year: klass.academic_year }
      : { ...EMPTY, academic_year: defaultYear() },
  )
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const isEdit = Boolean(klass)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'اسم الفصل مطلوب.'
    if (!/^\d{4}\s*\/\s*\d{4}$/.test(form.academic_year.trim()))
      next.academic_year = 'الصيغة: 2026/2027'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      grade_number: Number(form.grade_number),
      academic_year: form.academic_year.trim(),
    }
    try {
      if (isEdit) await ClassAPI.update(klass.id, payload)
      else await ClassAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل الفصل.' : 'تمت إضافة الفصل.')
      setOpen(false)
      onSaved?.()
      refreshClasses()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) toast.error(err.message)
      else setErrors({ name: err?.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const ok = await modal.confirm({
      title: `حذف "${klass.name}"؟`,
      message: 'لسه موجودين أولاد أو خدام في الفصل؟ السيرفر هيرفض الحذف.',
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await ClassAPI.remove(klass.id)
      toast.success('تم حذف الفصل.')
      onSaved?.()
      refreshClasses()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const triggerBtn =
    trigger === 'icon' ? (
      <Button variant="ghost" size="sm" icon={<Icon name="edit" size={15} />} onClick={() => setOpen(true)}>
        تعديل
      </Button>
    ) : (
      <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={() => setOpen(true)}>
        إضافة فصل
      </Button>
    )

  return (
    <>
      {triggerBtn}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? 'تعديل الفصل' : 'إضافة فصل جديد'}
        sub={isEdit ? klass.name : 'الفصل = مجموعة أولاد وخدام لسنة دراسية واحدة'}
        footer={
          <>
            {isEdit && isSuperAdmin && (
              <Button variant="danger" onClick={remove} style={{ marginInlineEnd: 'auto' }}>
                <Icon name="trash" size={15} />
                حذف
              </Button>
            )}
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" loading={busy} onClick={submit}>
              {isEdit ? 'حفظ' : 'إضافة'}
            </Button>
          </>
        }
      >
        <form className="stack" onSubmit={submit} noValidate>
          <Field label="اسم الفصل" required htmlFor="cls-name" error={errors.name}>
            <Input
              id="cls-name"
              placeholder="مثال: أولى إبتدائي"
              value={form.name}
              error={errors.name}
              onChange={set('name')}
            />
          </Field>

          <div className="grid-2">
            <Field label="الصف" hint="من 1 لـ 6" htmlFor="cls-grade">
              <Select id="cls-grade" value={form.grade_number} onChange={set('grade_number')}>
                {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="العام الدراسي" required htmlFor="cls-year" error={errors.academic_year}>
              <Input
                id="cls-year"
                dir="ltr"
                placeholder="2026/2027"
                value={form.academic_year}
                error={errors.academic_year}
                onChange={set('academic_year')}
              />
            </Field>
          </div>

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>
      </Modal>
    </>
  )
}
