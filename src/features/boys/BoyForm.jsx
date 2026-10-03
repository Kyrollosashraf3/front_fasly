import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { BoyAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'
import { calcAge } from '../../lib/format'

const EMPTY = {
  boy_name: '',
  gender: 'm',
  class_id: '',
  birth_date: '',
  phone: '',
  phone_2: '',
  zone: '',
  address: '',
  location: '',
  note: '',
  issue_flag: false,
}

/** Strip blanks so PATCH sends only what actually changed. */
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )

/**
 * BoyForm — create / edit one boy.
 *   <BoyForm open onClose={fn} boy={row|null} defaultClassId={n} onSaved={fn} />
 */
export function BoyForm({ open, onClose, boy, defaultClassId, onSaved }) {
  const { classes } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      boy
        ? {
            ...EMPTY,
            ...Object.fromEntries(
              Object.keys(EMPTY).map((k) => [k, boy[k] ?? EMPTY[k]]),
            ),
            class_id: String(boy.class_id),
            birth_date: boy.birth_date || '',
          }
        : { ...EMPTY, class_id: String(defaultClassId ?? classes[0]?.id ?? '') },
    )
  }, [open, boy, defaultClassId, classes])

  const isEdit = Boolean(boy)
  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const validate = () => {
    const next = {}
    if (!form.boy_name.trim()) next.boy_name = 'اسم الولد مطلوب.'
    if (!form.class_id) next.class_id = 'اختر الفصل.'
    if (form.birth_date && form.birth_date > new Date().toISOString().slice(0, 10))
      next.birth_date = 'تاريخ الميلاد مش ممكن يكون في المستقبل.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)

    const payload = compact({
      ...form,
      boy_name: form.boy_name.trim(),
      class_id: Number(form.class_id),
      birth_date: form.birth_date || null,
      phone: form.phone.trim(),
      phone_2: form.phone_2.trim(),
      zone: form.zone.trim(),
      address: form.address.trim(),
      location: form.location.trim(),
      note: form.note.trim(),
    })

    try {
      if (isEdit) await BoyAPI.update(boy.id, payload)
      else await BoyAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل بيانات الولد.' : 'تمت إضافة الولد.')
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

  const age = calcAge(form.birth_date)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'تعديل بيانات الولد' : 'إضافة ولد جديد'}
      sub={isEdit ? boy.boy_name : 'البيانات الأساسية للولد'}
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
        <div className="grid-2">
          <Field label="اسم الولد" required htmlFor="boy-name" error={errors.boy_name}>
            <Input
              id="boy-name"
              placeholder="مثال: مينا فؤاد"
              value={form.boy_name}
              error={errors.boy_name}
              onChange={set('boy_name')}
            />
          </Field>

          <Field label="النوع" required htmlFor="boy-gender">
            <Select id="boy-gender" value={form.gender} onChange={set('gender')}>
              <option value="m">ولد</option>
              <option value="f">بنت</option>
            </Select>
          </Field>

          <Field label="تاريخ الميلاد" htmlFor="boy-birth" error={errors.birth_date} hint={age !== null ? `السن: ${age} سنة` : 'اختياري'}>
            <Input
              id="boy-birth"
              type="date"
              value={form.birth_date}
              error={errors.birth_date}
              onChange={set('birth_date')}
            />
          </Field>

          <Field label="الفصل" required htmlFor="boy-class" error={errors.class_id}>
            <Select
              id="boy-class"
              value={form.class_id}
              error={errors.class_id}
              onChange={set('class_id')}
            >
              <option value="">— اختر الفصل —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="التليفون" htmlFor="boy-phone">
            <Input
              id="boy-phone"
              dir="ltr"
              placeholder="01012345678"
              value={form.phone}
              onChange={set('phone')}
            />
          </Field>

          <Field label="تليفون تاني" htmlFor="boy-phone2">
            <Input
              id="boy-phone2"
              dir="ltr"
              placeholder="01012345678"
              value={form.phone_2}
              onChange={set('phone_2')}
            />
          </Field>

          <Field label="المنطقة" htmlFor="boy-zone">
            <Input id="boy-zone" placeholder="شبرا" value={form.zone} onChange={set('zone')} />
          </Field>

          <Field label="لينك الخريطة" htmlFor="boy-loc">
            <Input
              id="boy-loc"
              dir="ltr"
              placeholder="https://maps.app.goo.gl/..."
              value={form.location}
              onChange={set('location')}
            />
          </Field>
        </div>

        <Field label="العنوان بالتفصيل" htmlFor="boy-addr">
          <Input
            id="boy-addr"
            placeholder="12 شارع الترعة، شبرا الخيمة"
            value={form.address}
            onChange={set('address')}
          />
        </Field>

        <Field label="ملاحظات" htmlFor="boy-note">
          <Textarea
            id="boy-note"
            rows={3}
            maxLength={500}
            placeholder="أي معلومة مهمة عن الولد"
            value={form.note}
            onChange={set('note')}
          />
        </Field>

        <Checkbox
          label="محتاج متابعة (يظهر بعلامة حمرا في القوائم)"
          checked={form.issue_flag}
          onChange={set('issue_flag')}
        />

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}

/** Small red flag shown next to a boy's name when `issue_flag` is on. */
export function FlagDot({ show }) {
  return show ? <span className="flag-dot" title="محتاج متابعة" /> : null
}

/** "✎" indicator + a note preview. */
export function NoteCell({ note }) {
  if (!note) return <span className="muted xsmall">—</span>
  return (
    <span className="row" style={{ gap: 5 }} title={note}>
      <Icon name="note" size={14} className="note-indicator" />
      <span className="small truncate" style={{ maxWidth: 150 }}>
        {note}
      </span>
    </span>
  )
}
