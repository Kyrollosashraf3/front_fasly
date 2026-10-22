import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { BoysPane, ServantPane, Step } from './AssignPanes'

/**
 * AssignGame — the playful two-step assignment flow.
 *
 *   1) tap a servant
 *   2) tap the boys who belong to him
 *   → save
 *
 * Every boy "lights up" when tapped, so filling a servant's group feels more
 * like a simple game than a form. `onAssign` returns true when the save
 * succeeded, which is the cue to clear the selection.
 */
export function AssignGame({
  groups = [],
  boys = [],
  assigning,
  onAssign,
  classIdForEdit,
  onSaved,
}) {
  const [teacherId, setTeacherId] = useState('')
  const [picked, setPicked] = useState(() => new Set())

  // A different class means a different set of servants and boys.
  useEffect(() => {
    setTeacherId('')
    setPicked(new Set())
  }, [classIdForEdit])

  const toggle = (boyId) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(boyId)) next.delete(boyId)
      else next.add(boyId)
      return next
    })

  const pickAll = () => setPicked(new Set(boys.map((b) => b.boy_id)))
  const clearPick = () => setPicked(new Set())

  const count = picked.size
  const selected = groups.find((g) => String(g.teacher_id) === teacherId)

  const submit = async () => {
    if (!teacherId || !count) return
    const ok = await onAssign(Number(teacherId), [...picked])
    if (ok) setPicked(new Set())
  }

  const servNo = 1
  const boysNo = 2

  return (
    <section className="game card">
      <div className="game__head">
        <div className="game__title">
          <span className="game__title-icon">
            <Icon name="groups" size={18} />
          </span>
          وزّع الأولاد على الخدام
        </div>
        <div className="game__steps">
          <Step n={servNo} label="الخادم" state={teacherId ? 'done' : 'active'} />
          <Step n={boysNo} label="الأولاد" state={teacherId ? 'active' : 'idle'} />
        </div>
      </div>

      <div className="game__body">
        <ServantPane n={servNo} groups={groups} teacherId={teacherId} onPick={setTeacherId} />

        <BoysPane
          n={boysNo}
          boys={boys}
          picked={picked}
          teacherId={teacherId}
          onToggle={toggle}
          classIdForEdit={classIdForEdit}
          onSaved={onSaved}
        />
      </div>

      <div className="game__bar">
        <div className="game__count">
          {count > 0 ? (
            <>
              <strong>{count}</strong> ولد مختار
              {selected ? ` لـ ${selected.teacher_name}` : ''}
            </>
          ) : (
            <span className="muted">اختار الخادم وبعدين دوس على الأولاد</span>
          )}
        </div>
        <div className="game__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!boys.length}
            onClick={pickAll}
          >
            اختيار الكل
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!count}
            onClick={clearPick}
          >
            مسح الاختيار
          </button>
          <Button
            variant="primary"
            loading={assigning}
            disabled={!teacherId || !count}
            onClick={submit}
            icon={<Icon name="check" size={16} />}
          >
            حفظ التوزيع{count ? ` (${count})` : ''}
          </Button>
        </div>
      </div>
    </section>
  )
}
