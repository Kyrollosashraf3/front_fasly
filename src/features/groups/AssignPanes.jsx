import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { BoyNameEdit } from '../boys/BoyName'

/** One numbered chip in the game header. */
export function Step({ n, label, state }) {
  return (
    <div className={`game__step is-${state}`}>
      <span className="game__step-num">
        {state === 'done' ? <Icon name="check" size={13} strokeWidth={2.6} /> : n}
      </span>
      <span className="game__step-label">{label}</span>
    </div>
  )
}

/** Step 2 — servant tiles. */
export function ServantPane({ n, groups, teacherId, onPick }) {
  return (
    <div className="game__pane">
      <div className="game__lbl">
        <span className="game__lbl-num">{n}</span> اختار الخادم
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
                onClick={() => onPick(String(g.teacher_id))}
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
  )
}

/** Step 3 — tap the boys that belong to the selected servant. */
export function BoysPane({ n, boys, picked, teacherId, onToggle, classIdForEdit, onSaved }) {
  return (
    <div className="game__pane">
      <div className="game__lbl">
        <span className="game__lbl-num">{n}</span> دوس على الأولاد
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
                  onClick={() => onToggle(b.boy_id)}
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
  )
}
