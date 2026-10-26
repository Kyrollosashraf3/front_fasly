import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { followLabel } from '../../boys/BoyProfile'
import { formatShort } from '../../../lib/format'
import { uniqueFollowHistory } from './followHistoryUtils'

/** The full follow-up history of one boy, as a dialog. */
export function HistoryModal({ boy, onClose }) {
  return (
    <Modal
      open={Boolean(boy)}
      onClose={onClose}
      size="md"
      title={boy ? `تاريخ افتقاد ${boy.boy_name}` : 'تاريخ الافتقاد'}
      footer={
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      {boy && (
        <div className="fu-history">
          <ul className="fu-history__list">
            {uniqueFollowHistory(boy.history).map((h) => (
              <li key={h.id ?? `${h.date}-${h.status}-${h.teacher_id}`}>
                <span className="fu-history__date">{formatShort(h.date)}</span>
                <Badge kind="navy">{followLabel(h.status)}</Badge>
                {h.teacher_name && <span className="muted small">{h.teacher_name}</span>}
                {h.note && <span className="fu-history__note">{h.note}</span>}
              </li>
            ))}
          </ul>
          {(!boy.history || boy.history.length === 0) && (
            <p className="muted small">لا يوجد سجل افتقاد.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
