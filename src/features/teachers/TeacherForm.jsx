import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { ChipSelect, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { TeacherAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'
import { FATHERS, SKILLS } from '../../lib/constants'

const EMPTY = {
  teacher_name: '',
  phone: '',
  phone_2: '',
  zone: '',
  address: '',
  location: '',
  father_name: '',
  skills: [],
  skills_custom: '',
  class_id: '',
  last_visit_date: '',
  note: '',
}

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
            phone_2: teacher.phone_2 || '',
            zone: teacher.zone || '',
            address: teacher.address || '',
            location: teacher.location || '',
            father_name: teacher.father_name || '',
            skills: Array.isArray(teacher.skills) ? teacher.skills : [],
            skills_custom: teacher.skills_custom || '',
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
      phone_2: form.phone_2.trim(),
      zone: form.zone.trim(),
      address: form.address.trim(),
      location: form.location.trim(),
    })
    // "" means "clear it" - PATCH only obeys an explicit null, and compact
    // would drop the key entirely.
    payload.father_name = form.father_name || null
    payload.skills = form.skills
    payload.skills_custom = form.skills_custom.trim() || null
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

          <Field label="التليفون الثانى" htmlFor="t-phone2">
            <Input id="t-phone2" dir="ltr" placeholder="01012345678" value={form.phone_2} onChange={set('phone_2')} />
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

          <Field label="المنطقة/الشارع" htmlFor="t-zone">
            <Input id="t-zone" placeholder="مثال: مصر الجديدة" value={form.zone} onChange={set('zone')} />
          </Field>

          <Field label="أبونا الاعتراف" htmlFor="t-father">
            <Select id="t-father" value={form.father_name} onChange={set('father_name')}>
              <option value="">— بدون —</option>
              {FATHERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="المهارات" htmlFor="t-skills" hint="اختار واحد أو أكتر من المهارات">
            <ChipSelect
              options={SKILLS}
              value={form.skills}
              ariaLabel="مهارات الخادم"
              onChange={(v) => setForm((f) => ({ ...f, skills: v }))}
            />
          </Field>

          <Field label="المهارة (كتابة)" htmlFor="t-skill-custom" hint="لو المهارة «أخرى» اكتبها هنا">
            <Input
              id="t-skill-custom"
              placeholder="مثال: خياطة"
              value={form.skills_custom}
              onChange={set('skills_custom')}
            />
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

          <Field label="رابط الموقع الجغرافى" htmlFor="t-loc">
            <Input
              id="t-loc"
              dir="ltr"
              placeholder="https://maps.app.goo.gl/..."
              value={form.location}
              onChange={set('location')}
            />
          </Field>
        </div>

        <Field label="عنوان المنزل بالتفصيل" htmlFor="t-address">
          <Textarea
            id="t-address"
            rows={2}
            placeholder="العنوان بالتفصيل"
            value={form.address}
            onChange={set('address')}
          />
        </Field>

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
