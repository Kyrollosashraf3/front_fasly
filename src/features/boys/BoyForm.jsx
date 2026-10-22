import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { useQuery } from '../../hooks'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'
import { calcAge } from '../../lib/format'
import { EMPTY, boyPayload, formStateFor, validateBoy } from './boyFormModel'
import { BoyFormFields } from './BoyFormFields'

export { FlagDot, NoteCell } from './boyBits'

/**
 * BoyForm — create / edit one boy.
 *   <BoyForm open onClose={fn} boy={row|null} defaultClassId={n} onSaved={fn} />
 */
export function BoyForm({ open, onClose, boy, defaultClassId, onSaved }) {
  const { classes } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  // The pristine form, so we can tell an edited form from a visited one.
  const [initial, setInitial] = useState('')

  useEffect(() => {
    if (!open) return
    setErrors({})
    const next = formStateFor(boy, defaultClassId, classes)
    setInitial(JSON.stringify(next))
    setForm(next)
  }, [open, boy, defaultClassId, classes])

  const isEdit = Boolean(boy)
  const dirty = open && JSON.stringify(form) !== initial
  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Servants of the class being picked - a boy may only be filed under one
  // of them, so the list has to follow the class select.
  const { data: servants } = useQuery(
    () => (form.class_id ? TeacherAPI.list({ class_id: form.class_id }) : Promise.resolve([])),
    [open, form.class_id],
    { enabled: open },
  )

  useEffect(() => {
    if (!open || !servants) return
    if (
      form.teacher_id &&
      !servants.some((t) => String(t.id) === String(form.teacher_id))
    ) {
      setForm((f) => ({ ...f, teacher_id: '' }))
    }
  }, [open, servants, form.teacher_id])

  const performSave = async () => {
    const nextErrors = validateBoy(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return false
    setBusy(true)

    try {
      const payload = boyPayload(form)
      if (isEdit) await BoyAPI.update(boy.id, payload)
      else await BoyAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل بيانات الولد.' : 'تمت إضافة الولد.')
      setInitial(JSON.stringify(form))
      onClose()
      onSaved?.()
      return true
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length)
        setErrors(err.fields)
      else toast.error(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    performSave()
  }

  /** Close, asking first when the form carries unsaved edits. */
  const requestClose = async () => {
    if (!dirty) {
      onClose()
      return
    }
    const ok = await modal.confirm({
      title: 'تجاهل التعديلات؟',
      message: 'لو قفلت دلوقتي هتخسر أي تعديلات لسه متحفظتش.',
      confirmLabel: 'تجاهل وخروج',
      kind: 'danger',
    })
    if (ok) onClose()
  }

  // Block navigation / refresh while the form has unsaved edits.
  useUnsavedGuard(open && dirty, performSave, 'فيه تعديلات على بيانات الولد لسه متحفظتش.')

  const age = calcAge(form.birth_date)

  return (
    <Modal
      open={open}
      onClose={requestClose}
      size="lg"
      title={isEdit ? 'تعديل بيانات الولد' : 'إضافة ولد جديد'}
      sub={isEdit ? boy.boy_name : 'البيانات الأساسية للولد'}
      footer={
        <>
          <Button variant="secondary" onClick={requestClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </>
      }
    >
      <BoyFormFields
        form={form}
        set={set}
        setForm={setForm}
        errors={errors}
        classes={classes}
        servants={servants}
        age={age}
        onSubmit={submit}
      />
    </Modal>
  )
}
