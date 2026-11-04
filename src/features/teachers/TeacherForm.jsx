import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TeacherAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'
import { TeacherFormFields } from './TeacherFormFields'
import { EMPTY, buildPayload, formStateFor } from './teacherFormModel'

/** Create / edit one servant. Managers only. */
export function TeacherForm({ open, onClose, teacher, defaultClassId, onSaved }) {
  const { classes, isSuperAdmin } = useAuth()
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
    // A class-less servant (أمين مرحلة / أدمن عام لاحقًا) starts blank for the
    // super admin - he is the only one who may save one without a class.
    const next = formStateFor(teacher, isSuperAdmin ? '' : defaultClassId, classes)
    setInitial(JSON.stringify(next))
    setForm(next)
  }, [open, teacher, defaultClassId, classes, isSuperAdmin])

  const isEdit = Boolean(teacher)
  const dirty = open && JSON.stringify(form) !== initial
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  /** Only the church-wide amin saves a servant outside every class. */
  const canSkipClass = isSuperAdmin

  const performSave = async () => {
    if (!form.teacher_name.trim()) {
      setErrors({ teacher_name: 'اسم الخادم مطلوب.' })
      return false
    }
    if (!canSkipClass && !form.class_id) {
      setErrors({ class_id: 'اختار الفصل اللي الخادم هيتبقى معاه.' })
      return false
    }
    setBusy(true)
    try {
      const payload = buildPayload(form)
      if (isEdit) await TeacherAPI.update(teacher.id, payload)
      else await TeacherAPI.create(payload)
      toast.success(isEdit ? 'تم تعديل بيانات الخادم.' : 'تمت إضافة الخادم.')
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
  useUnsavedGuard(open && dirty, performSave, 'فيه تعديلات على بيانات الخادم لسه متحفظتش.')

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={isEdit ? 'تعديل بيانات الخادم' : 'إضافة خادم جديد'}
      sub={isEdit ? teacher.teacher_name : 'الخدمات المسندة للفصل'}
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
      <TeacherFormFields
        form={form}
        errors={errors}
        set={set}
        classes={classes}
        setForm={setForm}
        canSkipClass={canSkipClass}
        onSubmit={submit}
      />
    </Modal>
  )
}
