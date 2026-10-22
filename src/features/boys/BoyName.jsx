import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { BoyAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/Button'
import { BoyForm } from './BoyForm'
import { FlagDot } from './boyBits'

/**
 * BoyName / BoyNameEdit — a boy's name with the ✎ data-edit marker beside it.
 *
 * Every screen that shows a boy's name renders these two, so the marker can
 * never go missing somewhere: it opens the very same BoyForm used by the boys
 * page (name, both phones, zone, address, map link, notes, servant, flag).
 *
 *   <BoyName boy={row} classId={classId} onSaved={refetch} />   // full cell
 *   <BoyNameEdit boy={row} />                                    // marker only
 *
 * `boy` may be a full row (BoysPage, AttendancePage, …) or the partial shape
 * the group/dashboard lists return (`boy_id` + `boy_name`); a partial row is
 * completed with one GET /boys/{id} the first time the marker is pressed.
 */

const idOf = (boy) => boy?.id ?? boy?.boy_id ?? null

/** The ✎ marker itself — hidden for a boy login, who may never write his row. */
export function BoyNameEdit({ boy, classId, onSaved, size = 14, label }) {
  const { can, user } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [record, setRecord] = useState(null)
  const [busy, setBusy] = useState(false)

  const id = idOf(boy)
  if (!can.editBoys(user) || !id) return null

  // A full boy record already carries everything BoyForm needs — no extra
  // request. Partial list rows (dashboard / groups) lack `teacher_id`, so they
  // must be completed first or the form would submit it as null and unfile him.
  const complete = Boolean(boy?.id && boy?.class_id && 'teacher_id' in boy)

  const start = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (complete) {
      setRecord(boy)
      setOpen(true)
      return
    }
    setBusy(true)
    try {
      setRecord(await BoyAPI.get(id))
      setOpen(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <IconButton
        icon={busy ? <span className="btn-spinner" /> : <Icon name="edit" size={size} />}
        className="boy-edit"
        label={label || `تعديل بيانات ${boy?.boy_name ?? 'الولد'}`}
        disabled={busy}
        onClick={start}
      />

      {open && record && (
        <BoyForm
          open
          boy={record}
          defaultClassId={Number(classId ?? record.class_id)}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  )
}

/**
 * The name cell itself: follow-up flag + name + optional suffix + the marker.
 * `suffix` keeps trailing bits like "(بنت)" or a count next to the name.
 */
export function BoyName({ boy, classId, onSaved, flag = true, suffix, className = '', ...rest }) {
  return (
    <span className={`boy-name ${className}`.trim()} {...rest}>
      {flag && <FlagDot show={boy?.issue_flag} />}
      <span className="truncate">{boy?.boy_name}</span>
      {suffix}
      <BoyNameEdit boy={boy} classId={classId} onSaved={onSaved} />
    </span>
  )
}