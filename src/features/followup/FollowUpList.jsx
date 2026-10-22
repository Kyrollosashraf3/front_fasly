import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ContactActions } from '../../components/ui/ContactActions'
import { Icon } from '../../components/ui/Icon'
import { BoyName } from '../boys/BoyName'
import { followLabel } from '../boys/BoyProfile'
import { formatDate } from '../../lib/format'
import { KIND } from './constants'

/**
 * One compact line per boy: his name (with the ✎ data marker), his phones, the
 * latest follow-up logged today (with the edit marker and the day's count), and
 * the two actions — «تفاصيل» and «تسجيل افتقاد» (always adds a new log).
 */
export function FollowUpList({
  rows,
  classId,
  canWrite,
  followedByBoy,
  countByBoy,
  nameOfTeacher,
  onDetails,
  onLog,
  refetch,
}) {
  return (
    <ul className="fu-list">
      {rows.map((boy) => {
        const log = followedByBoy.get(boy.id)
        const count = countByBoy.get(boy.id) || 0
        return (
          <li key={boy.id} className={`fu-row${log ? ' is-logged' : ''}`}>
            <div className="fu-row__who">
              <BoyName boy={boy} classId={classId} onSaved={refetch} />
              <ContactActions phone={boy.phone} phone2={boy.phone_2} />
            </div>

            <div className="fu-row__log">
              {log ? (
                <button
                  type="button"
                  className="fu-log"
                  onClick={() => onLog(boy, { edit: true })}
                  title="تعديل آخر افتقاد"
                >
                  <Icon name="edit" size={14} />
                  <Badge kind={KIND[log.status] || 'neutral'}>{followLabel(log.status)}</Badge>
                  <span className="xsmall muted">{formatDate(log.action_date, { withDay: false })}</span>
                  <span className="xsmall muted">· {nameOfTeacher(log.teacher_id)}</span>
                  {count > 1 && (
                    <span className="fu-log__n" title="عدد الافتقادات المسجلة في هذا اليوم">
                      {count}
                    </span>
                  )}
                </button>
              ) : (
                <span className="xsmall muted">لسه ماتسجلش افتقاد</span>
              )}
            </div>

            <div className="fu-row__actions">
              <Button size="sm" icon={<Icon name="eye" size={14} />} onClick={() => onDetails(boy)}>
                تفاصيل
              </Button>
              {canWrite && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Icon name="heart" size={14} />}
                  onClick={() => onLog(boy)}
                >
                  تسجيل افتقاد
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
