import { useEffect, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { BoyNameEdit } from '../boys/BoyName'

/**
 * AssignGame — the playful three-step assignment flow.
 *
 *   1) pick a class   (only for a super admin / multi-class login)
 *   2) tap a servant
 *   3) tap the boys who belong to him
 *   → save
 *
 * Every boy "lights up" when tapped, so filling a servant's group feels more
 * like a simple game than a form. `onAssign` returns true when the save
 * succeeded, which is the cue to clear the selection.
 */

function Step({ n, label, state }) {
  return (
    <div className={`game__step is-${state}`}>
      <span className="game__step-num">
        {state === 'done' ? <Icon name="check" size={13} strokeWidth={2.6} /> : n}
      </span>
      <span className="game__step-label">{label}</span>
    </div>
  )
}

export function AssignGame({
  classes = [],
  classId,
  onClassChange,
  showClassPicker,
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
  }, [classId])

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

  const clsNo = showClassPicker ? 1 : 0
  const servNo = clsNo + 1
  const boysNo = servNo + 1

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
          {showClassPicker && <Step n={clsNo} label="الفصل" state="done" />}
          <Step n={servNo} label="الخادم" state={teacherId ? 'done' : 'active'} />
          <Step n={boysNo} label="الأولاد" state={teacherId ? 'active' : 'idle'} />
        </div>
      </div>

      <div className="game__body">
        {showClassPicker && (
          <div className="game__pane">
            <div className="game__lbl">
              <span className="game__lbl-num">{clsNo}</span> اختار الفصل
            </div>
            <div className="game__classes">
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`game__class${String(classId) === String(c.id) ? ' is-active' : ''}`}
                  onClick={() => onClassChange(String(c.id))}
                >
                  <Icon name="list" size={15} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="game__pane">
          <div className="game__lbl">
            <span className="game__lbl-num">{servNo}</span> اختار الخادم
          </div>
          {groups.length === 0 ? (
            <p className="muted small game__note">
              مفيش خدام في الفصل ده لسه — ضيف الخدام الأول من صفحة الخدام.
            </p>
          ) : (
            <div className="game__servants">
              {groups.map((g) => {
                const on = String(g.teacher_id) === teacherId
                return (
                  <button
                    key={g.teacher_id}
                    type="button"
                    className={`servant-tile${on ? ' is-active' : ''}`}
                    aria-pressed={on}
                    onClick={() => setTeacherId(String(g.teacher_id))}
                  >
                    <Avatar name={g.teacher_name} size="md" gold={on} />
                    <span className="servant-tile__text">
                      <span className="servant-tile__name truncate">{g.teacher_name}</span>
                      <span className="servant-tile__count">
                        {g.boys_count > 0 ? `${g.boys_count} ولد معاه` : 'لسه فاضي'}
                      </span>
                    </span>
                    <span className="servant-tile__tick">
                      <Icon name="check" size={15} strokeWidth={2.6} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="game__pane">
          <div className="game__lbl">
            <span className="game__lbl-num">{boysNo}</span> دوس على الأولاد
            <span className="game__lbl-hint">
              {teacherId ? 'اختار اللي هيبقوا مع الخادم ده' : 'اختار الخادم الأول'}
            </span>
          </div>

          {boys.length === 0 ? (
            <p className="game__done">
              <Icon name="check" size={17} strokeWidth={2.6} />
              كل الأولاد في الفصل متوزعين
            </p>
          ) : (
            <div className="game__boys">
              {boys.map((b) => {
                const on = picked.has(b.boy_id)
                return (
                  <div key={b.boy_id} className={`boy-tile-wrap${on ? ' is-picked' : ''}`}>
                    <button
                      type="button"
                      className="boy-tile"
                      aria-pressed={on}
                      onClick={() => toggle(b.boy_id)}
                    >
                      <Avatar name={b.boy_name} size="sm" gold={on} />
                      <span className="boy-tile__name truncate">{b.boy_name}</span>
                      <span className="boy-tile__check">
                        <Icon name="check" size={14} strokeWidth={2.8} />
                      </span>
                    </button>
                    <BoyNameEdit boy={b} classId={classIdForEdit} onSaved={onSaved} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
