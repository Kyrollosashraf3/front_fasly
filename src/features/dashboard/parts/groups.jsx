import { useAuth } from '../../../context/AuthContext'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/States'
import { BoyName } from '../../boys/BoyName'
import { formatShort } from '../../../lib/format'

/**
 * The "class → boys" group lists used by streaks / absentees.
 * Rows carry an extra badge and a "OO" button.
 */
export function ClassGroups({
  groups = {},
  singleClass = false,
  emptyTitle,
  emptyMsg,
  badge,
  onBoy,
  actionLabel = 'OO',
}) {
  const { classLabel } = useAuth()
  const classes = Object.keys(groups).filter((c) => groups[c]?.length)
  if (!classes.length) {
    return <EmptyState icon="chart" title={emptyTitle} message={emptyMsg} inline />
  }
  const showHead = classes.length > 1 || !singleClass

  return (
    <div className="class-groups">
      {classes.map((c) => (
        <div className="class-group" key={c}>
          {showHead && <h3 className="class-group__title">{classLabel(Number(c))}</h3>}
          <div className="name-list">
            {groups[c].map((b) => (
              <div className="name-list__item" key={b.boy_id}>
                <span className="name-list__main">
                  <BoyName
                    boy={b}
                    classId={Number(c)}
                    flag={false}
                    suffix={badge ? badge(b) : null}
                  />
                </span>
                <Button variant="secondary" size="sm" onClick={() => onBoy?.(b)}>
                  {actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The "class → servants" group lists used by follow-up coverage / confessions.
 * Rows carry a name, an optional note (count / last date) and a badge.
 * Servants have no drill-down modal, so there is no action button.
 */
export function ServantGroups({
  groups = {},
  singleClass = false,
  emptyTitle,
  emptyMsg,
  badge,
}) {
  const { classLabel } = useAuth()
  const classes = Object.keys(groups).filter((c) => groups[c]?.length)
  if (!classes.length) {
    return <EmptyState icon="servant" title={emptyTitle} message={emptyMsg} inline />
  }
  const showHead = classes.length > 1 || !singleClass

  return (
    <div className="class-groups">
      {classes.map((c) => (
        <div className="class-group" key={c}>
          {showHead && <h3 className="class-group__title">{classLabel(Number(c))}</h3>}
          <div className="name-list">
            {groups[c].map((s) => (
              <div className="name-list__item" key={s.teacher_id}>
                <span className="name-list__main">
                  <strong>{s.teacher_name}</strong>
                  {s.count !== undefined && <span className="muted small">• {s.count} افتقاد</span>}
                  {s.last && <span className="muted small">• آخر {formatShort(s.last)}</span>}
                  {badge ? badge(s) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
