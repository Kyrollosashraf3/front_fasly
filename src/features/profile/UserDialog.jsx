import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { AuthAPI } from '../../lib/endpoints'
import { ROLE_OPTIONS } from '../../lib/roles'
import { isPhone, normalisePhone } from '../../lib/constants'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EMPTY_USER, OWNER_ROLES, handleOf } from './accountHelpers'

/** Create / edit one login: phone, optional password, role and owner. */
export function UserDialog({ target, teachers, boys, canSuper, classLabel, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = typeof target === 'object' && target !== null
  const [form, setForm] = useState(EMPTY_USER)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!target) return
    setErrors({})
    setForm(
      isEdit
        ? {
            phone: target.phone || '',
            password: '',
            role: target.role,
            teacher_id: target.teacher_id ? String(target.teacher_id) : '',
            boy_id: target.boy_id ? String(target.boy_id) : '',
          }
        : { ...EMPTY_USER },
    )
  }, [target, isEdit])

  const roleOptions = useMemo(
    () => ROLE_OPTIONS.filter((r) => r.value !== 'super_admin' || canSuper),
    [canSuper],
  )

  const role = form.role
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const capturedOwner = useMemo(() => {
    if (!isEdit) return ''
    if (target.teacher_id) {
      const t = teachers.find((x) => x.id === target.teacher_id)
      return t ? `${t.teacher_name} — ${classLabel(t.class_id)}` : `خادم #${target.teacher_id}`
    }
    if (target.boy_id) {
      const b = boys.find((x) => x.id === target.boy_id)
      return b ? `${b.boy_name} — ${classLabel(b.class_id)}` : `ولد #${target.boy_id}`
    }
    return ''
  }, [isEdit, target, teachers, boys, classLabel])

  // Editing keeps the owner the manager clicked on: it is shown read-only so he
  // never has to pick the servant again. Switching the role re-opens the picker.
  const lockOwner = isEdit && target.role === role && Boolean(capturedOwner)

  const ownerOptions = () => {
    if (OWNER_ROLES.includes(role)) {
      return [
        <option key="none" value="">
          — اختر الخادم —
        </option>,
        ...teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.teacher_name} ({classLabel(t.class_id)})
          </option>
        )),
      ]
    }
    if (role === 'user') {
      return [
        <option key="none" value="">
          — اختر الولد —
        </option>,
        ...boys.map((b) => (
          <option key={b.id} value={b.id}>
            {b.boy_name} ({classLabel(b.class_id)})
          </option>
        )),
      ]
    }
    return [
      <option key="none" value="">
        بدون (أدمن عام)
      </option>,
    ]
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    const phone = normalisePhone(form.phone)

    // A new account is addressed by phone; the owner sets his own password
    // later from the signup screen, so the password field stays optional.
    if (!isEdit && !phone) next.phone = 'رقم التليفون مطلوب.'
    else if (phone && !isPhone(phone)) next.phone = 'رقم التليفون غير صحيح (01xxxxxxxxx).'
    if (form.password && form.password.length < 8)
      next.password = 'كلمة المرور 8 حروف على الأقل.'
    if (OWNER_ROLES.includes(role) && !form.teacher_id) next.owner = 'اختر الخادم.'
    if (role === 'user' && !form.boy_id) next.owner = 'اختر الولد.'
    setErrors(next)
    if (Object.keys(next).length) return

    const payload = { role }
    payload.phone = phone || null
    if (form.password) payload.password = form.password

    // The schema re-validates the owner on every update that carries `role`,
    // so both keys travel together — the unused one is explicitly null.
    if (OWNER_ROLES.includes(role)) {
      payload.teacher_id = Number(form.teacher_id)
      payload.boy_id = null
    } else if (role === 'user') {
      payload.boy_id = Number(form.boy_id)
      payload.teacher_id = null
    } else {
      payload.teacher_id = null
      payload.boy_id = null
    }

    setBusy(true)
    try {
      if (isEdit) {
        await AuthAPI.updateUser(target.id, payload)
        toast.success('تم تعديل الحساب.')
      } else {
        await AuthAPI.createUser(payload)
        toast.success('تم إنشاء الحساب.')
      }
      onSaved?.()
    } catch (err) {
      setErrors({ phone: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (!target) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'تعديل حساب' : 'إضافة حساب'}
      sub={isEdit ? handleOf(target) : 'رقم التليفون + الصلاحية والمسند إليه'}
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
        <Field
          label="رقم التليفون"
          required={!isEdit}
          htmlFor="u-phone"
          error={errors.phone}
          hint="به يسجّل الدخول ويكمل التسجيل"
        >
          <Input
            id="u-phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01012345678"
            value={form.phone}
            error={errors.phone}
            onChange={set('phone')}
          />
        </Field>

        <Field
          label="كلمة المرور"
          htmlFor="u-pass"
          error={errors.password}
          hint={isEdit ? 'اتركه فارغًا عشان تسيبها زي ما هي.' : 'اتركه فارغًا لو هيكمل التسجيل بنفسه.'}
        >
          <Input
            id="u-pass"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={set('password')}
          />
        </Field>

        <Field label="الصلاحية" htmlFor="u-role">
          <Select id="u-role" value={form.role} onChange={set('role')}>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        {OWNER_ROLES.includes(role) || role === 'user' ? (
          lockOwner ? (
            <Field label={role === 'user' ? 'الولد' : 'الخادم'} hint="متحدد تلقائيًا من الحساب.">
              <Input value={capturedOwner} readOnly disabled />
            </Field>
          ) : (
            <Field
              label={role === 'user' ? 'الولد' : 'الخادم'}
              required
              htmlFor="u-owner"
              error={errors.owner}
            >
              <Select
                id="u-owner"
                value={role === 'user' ? form.boy_id : form.teacher_id}
                error={errors.owner}
                onChange={set(role === 'user' ? 'boy_id' : 'teacher_id')}
                searchable
                searchPlaceholder={role === 'user' ? 'ابحث باسم الولد...' : 'ابحث باسم الخادم...'}
              >
                {ownerOptions()}
              </Select>
            </Field>
          )
        ) : lockOwner ? (
          <Field label="الخادم" hint="متحدد تلقائيًا من الحساب.">
            <Input value={capturedOwner} readOnly disabled />
          </Field>
        ) : (
          <p className="small muted">الأدمن العام مسند لكل الفصول تلقائيًا.</p>
        )}

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
