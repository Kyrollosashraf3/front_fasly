import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { useQuery } from '../../hooks'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { ApiError } from '../../lib/api'
import { calcAge } from '../../lib/format'
import { EMPTY, boyPayload, formStateFor, validateBoy } from './boyFormModel'
import { BoyFormFields } from './BoyFormFields'

export { FlagDot, NoteCell } from './boyBits'

/** The server's two answers to a name that is already on file. */
const CLASH_CODES = ['boy_name_taken', 'boy_name_similar']

const clashOf = (err) => {
  const detail = err instanceof ApiError ? err.detail : null
  return detail && CLASH_CODES.includes(detail.code) ? detail : null
}

const WHY = {
  same_name: 'نفس الاسم',
  nested_name: 'اسم ناقص أو زيادة اسم',
  spelling: 'كتابة مختلفة للاسم',
}

/**
 * NameClashNote — the directory already has this name, or one close to it.
 * A 100% match is refused and only offers the way out (open the boy on file);
 * a look-alike is a question, answered by adding him anyway or by moving to
 * the row that is probably his.
 */
function NameClashNote({ clash, busy, onConfirm, onGoTo }) {
  const taken = clash.code === 'boy_name_taken'
  return (
    <div className={`clash ${taken ? 'clash--taken' : 'clash--similar'}`} role="alert">
      <div className="clash__head">
        <Icon name="alert" size={16} />
        <span className="bold">
          {taken ? 'مسجّل عندنا نفس الاسم بالظبط' : 'مسجّل عندنا اسم بيشبهه'}
        </span>
      </div>

      <ul className="clash__list">
        {clash.matches.map((match) => (
          <li key={match.id} className="clash__row">
            <button
              type="button"
              className="clash__name"
              title="انتقل لكارت بياناته"
              onClick={() => onGoTo(match)}
            >
              {match.boy_name}
            </button>
            <span className="xsmall muted">
              {match.class_name || '—'}
              {match.score < 100 && ` · ${match.score}%`}
              {WHY[match.via] && ` · ${WHY[match.via]}`}
            </span>
          </li>
        ))}
      </ul>

      <div className="clash__foot">
        <span className="xsmall muted">
          {taken
            ? 'مش ممكن يتسجل الولد مرتين — افتح الموجود وعدّل بياناته، أو غيّر الاسم.'
            : 'لو هو نفس الولد افتح بياناته، ولو ولد تاني كمّل تسجيله.'}
        </span>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" onClick={() => onGoTo(clash.matches[0])}>
            انتقل للموجود
          </Button>
          {!taken && (
            <Button variant="primary" loading={busy} onClick={onConfirm}>
              تأكيد التسجيل
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

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
  // A name the directory already knows, waiting for the person to answer.
  const [clash, setClash] = useState(null)
  // The pristine form, so we can tell an edited form from a visited one.
  const [initial, setInitial] = useState('')

  useEffect(() => {
    if (!open) return
    setErrors({})
    setClash(null)
    const next = formStateFor(boy, defaultClassId, classes)
    setInitial(JSON.stringify(next))
    setForm(next)
  }, [open, boy, defaultClassId, classes])

  const isEdit = Boolean(boy)
  const dirty = open && JSON.stringify(form) !== initial
  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  /** One of the three name boxes; a new name is a new question. */
  const setNamePart = (index) => (e) => {
    setClash(null)
    setForm((f) => {
      const parts = [...f.name_parts]
      parts[index] = e.target.value
      return { ...f, name_parts: parts }
    })
  }

  // Servants of the class being picked - a boy may only be filed under one
  // of them, so the list has to follow the class select.
  const { data: servants, loading: servantsLoading } = useQuery(
    () => (form.class_id ? TeacherAPI.list({ class_id: form.class_id }) : Promise.resolve([])),
    [open, form.class_id],
    { enabled: open },
  )

  useEffect(() => {
    // Only trust a list that has actually arrived for this class. On the render
    // where `form.class_id` first becomes the boy's class, the query still
    // holds the previous (empty) result and `servantsLoading` is stale-false;
    // treating that as "his servant is gone" blanked teacher_id, so the save
    // sent `teacher_id: null` and silently unfiled him from his group.
    if (!open || servantsLoading || !servants?.length) return
    if (
      form.teacher_id &&
      !servants.some((t) => String(t.id) === String(form.teacher_id))
    ) {
      setForm((f) => ({ ...f, teacher_id: '' }))
    }
  }, [open, servants, servantsLoading, form.teacher_id])

  const performSave = async ({ confirmSimilar = false } = {}) => {
    const nextErrors = validateBoy(form, isEdit)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return false
    setBusy(true)

    try {
      const payload = boyPayload(form)
      if (isEdit) await BoyAPI.update(boy.id, payload)
      else await BoyAPI.create({ ...payload, confirm_similar: confirmSimilar })
      setClash(null)
      toast.success(isEdit ? 'تم تعديل بيانات الولد.' : 'تمت إضافة الولد.')
      setInitial(JSON.stringify(form))
      onClose()
      onSaved?.()
      return true
    } catch (err) {
      const found = clashOf(err)
      if (found) setClash(found)
      else if (err instanceof ApiError && err.fields && Object.keys(err.fields).length)
        setErrors(err.fields)
      else toast.error(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  /**
   * Leave the form for the boy already on file. The typed name is the very
   * clash being answered, so the form is dropped rather than saved—but only
   * after the person agrees to lose what else they had filled in.
   */
  const goToBoy = async (match) => {
    if (!match) return
    if (dirty) {
      const ok = await modal.confirm({
        title: 'انتقال لكارت الولد الموجود؟',
        message: 'هتقفل الإضافة من غير حفظ، واللي كتبته هيتلغى.',
        confirmLabel: 'انتقل',
        kind: 'danger',
      })
      if (!ok) return
    }
    // Close first: that disarms the unsaved-changes guard, so the jump below
    // is not mistaken for a back press. A tick later, so the guard has already
    // stepped off the history entry it parked on top of this page.
    onClose()
    setTimeout(() => {
      window.location.hash = `#/class/${match.class_id}/boys?boy=${match.id}`
    }, 60)
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
        setNamePart={setNamePart}
        errors={errors}
        classes={classes}
        servants={servants}
        age={age}
        isEdit={isEdit}
        nameNote={
          clash && (
            <NameClashNote
              clash={clash}
              busy={busy}
              onConfirm={() => performSave({ confirmSimilar: true })}
              onGoTo={goToBoy}
            />
          )
        }
        onSubmit={submit}
      />
    </Modal>
  )
}
