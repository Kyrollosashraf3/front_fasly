import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { TeacherAPI } from '../../lib/endpoints'
import { FATHERS, SKILLS } from '../../lib/constants'
import { todayISO } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { ChipSelect, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'

const EMPTY = {
  teacher_name: '',
  birth_date: '',
  last_visit_date: '',
  father_name: '',
  zone: '',
  address: '',
  note: '',
  skills: [],
  custom: '',
}

/** A servant's own row as form values — «أخرى» skills split out into `custom`. */
function formOf(record) {
  if (!record) return { ...EMPTY, skills: [] }
  const skills = Array.isArray(record.skills) ? record.skills : []
  return {
    teacher_name: record.teacher_name || '',
    birth_date: record.birth_date || '',
    last_visit_date: record.last_visit_date || '',
    father_name: record.father_name || '',
    zone: record.zone || '',
    address: record.address || '',
    note: record.note || '',
    skills: skills.filter((s) => SKILLS.includes(s)),
    custom: skills.filter((s) => !SKILLS.includes(s)).join('، '),
  }
}

/** Body for PATCH /teachers/me — a blank date clears the column, so it goes as null. */
function payloadOf(form) {
  const custom = form.custom
    .split('،')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    teacher_name: form.teacher_name.trim(),
    birth_date: form.birth_date || null,
    last_visit_date: form.last_visit_date || null,
    father_name: form.father_name || null,
    zone: form.zone.trim() || null,
    address: form.address.trim() || null,
    note: form.note.trim() || null,
    skills: [...form.skills, ...custom],
  }
}

/**
 * MyProfileDialog — the servant editing his own record.
 *
 * Deliberately narrower than the amin's teacher form: no phone (it is the login)
 * and no class (the amin moves people between classes). Both show read-only so
 * he sees why they are missing.
 */
export function MyProfileDialog({ record, phone, classLabel, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(() => formOf(record))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(formOf(record))
    setErrors({})
  }, [record])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.teacher_name.trim()) return setErrors({ teacher_name: 'الاسم مطلوب.' })
    setErrors({})

    setBusy(true)
    try {
      await TeacherAPI.updateMe(payloadOf(form))
      toast.success('تم تحديث بياناتك.')
      onSaved?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!record) return null

  return (
    <Modal
      open
      onClose={onClose}
      title="تعديل بياناتي"
      sub="كل بياناتك ما عدا رقم التليفون والفصل."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            حفظ التعديلات
          </Button>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="الاسم" required htmlFor="me-name" error={errors.teacher_name}>
          <Input
            id="me-name"
            placeholder="مثال: أ. مينا عادل"
            value={form.teacher_name}
            error={errors.teacher_name}
            onChange={set('teacher_name')}
          />
        </Field>

        <div className="grid-2">
          <Field label="تاريخ الميلاد" htmlFor="me-birth">
            <Input
              id="me-birth"
              type="date"
              max={todayISO()}
              value={form.birth_date}
              onChange={set('birth_date')}
            />
          </Field>

          <Field label="آخر اعتراف" htmlFor="me-visit">
            <Input
              id="me-visit"
              type="date"
              max={todayISO()}
              value={form.last_visit_date}
              onChange={set('last_visit_date')}
            />
          </Field>

          <Field label="أب الاعتراف" htmlFor="me-father">
            <Select id="me-father" value={form.father_name} onChange={set('father_name')}>
              <option value="">— بدون —</option>
              {FATHERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="المنطقة/الشارع" htmlFor="me-zone">
            <Input
              id="me-zone"
              placeholder="مثال: مصر الجديدة"
              value={form.zone}
              onChange={set('zone')}
            />
          </Field>
        </div>

        <Field
          label="المهارات"
          htmlFor="me-skills"
          hint="اختار واحد أو أكتر؛ لو مش موجودة اختار «أخرى» واكتبها"
        >
          <ChipSelect
            options={SKILLS}
            value={form.skills}
            ariaLabel="مهاراتي"
            onChange={(v) => setForm((f) => ({ ...f, skills: v }))}
          />
        </Field>

        {(form.skills.includes('أخرى') || form.custom.trim()) && (
          <Field
            label="اكتب المهارة"
            htmlFor="me-skill-custom"
            hint="ظهرت لأنك اخترت «أخرى» — بتتخزن في نفس عمود المهارات"
          >
            <Input
              id="me-skill-custom"
              placeholder="مثال: خياطة"
              value={form.custom}
              onChange={set('custom')}
            />
          </Field>
        )}

        <Field label="عنوان المنزل بالتفصيل" htmlFor="me-address">
          <Textarea
            id="me-address"
            rows={2}
            placeholder="العنوان بالتفصيل"
            value={form.address}
            onChange={set('address')}
          />
        </Field>

        <Field label="ملاحظات" htmlFor="me-note">
          <Textarea
            id="me-note"
            rows={3}
            maxLength={500}
            placeholder="دوري في الخدمة، ملاحظات عايز أكتبها..."
            value={form.note}
            onChange={set('note')}
          />
        </Field>

        <div className="grid-2">
          <Field label="رقم التليفون" hint="ده حسابك — تعديله عند أمين الفصل.">
            <Input value={phone || '—'} dir="ltr" readOnly disabled />
          </Field>
          <Field label="الفصل" hint="أمين الفصل هو اللي يحدده.">
            <Input value={classLabel || '—'} readOnly disabled />
          </Field>
        </div>

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
