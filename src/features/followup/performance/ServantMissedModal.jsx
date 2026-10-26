import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { followLabel } from '../../boys/BoyProfile'
import { KIND } from '../constants'
import { formatShort } from '../../../lib/format'

/**
 * بوكس يُفتح عند الضغط على عدد أولاد الخادم في جدول أداء الخدام.
 * يعرض أسماء الأولاد الذين تواصل معهم الخادم في الفترة المختارة، مع التاريخ
 * ونوع الافتقاد لكل ولد، وسجل التواريخ إن وجد.
 */
export function ServantMissedModal({
  servant,
  boys = [],
  onClose,
  title,
  sub,
  showGroupServant = false,
}) {
  const heading = title ?? (servant ? `أبناء ${servant.teacher_name}` : 'أبناء الخادم')
  const subtitle =
    sub ??
    (servant
      ? `${boys.length} ولد${boys.length !== 1 ? 'اً' : ''} تم افتقادهم في الفترة المختارة`
      : '')
  return (
    <Modal
      open={Boolean(servant)}
      onClose={onClose}
      size="md"
      title={heading}
      sub={subtitle}
      footer={
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      {servant && (
        <div className="servant-kids__box">
          {boys.length === 0 ? (
            <p className="muted small">
              لا يوجد أولاد تم افتقادهم لهذا الخادم في الفترة المختارة.
            </p>
          ) : (
            <ul className="servant-kids__list">
              {boys.map((b) => (
                <li key={b.id} className="servant-kids__row">
                  <span className="servant-kids__name">{b.boy_name}</span>
                  {showGroupServant && (
                    <span className="servant-kids__servant">
                      {b.servant_name
                        ? `خادم المجموعة: ${b.servant_name}`
                        : 'بدون مجموعة'}
                    </span>
                  )}
                  <span className="servant-kids__date">
                    {b.last_date ? formatShort(b.last_date) : '—'}
                  </span>
                  <Badge kind={KIND[b.last_status] || 'neutral'}>
                    {followLabel(b.last_status || '—')}
                  </Badge>
                  {b.history && b.history.length > 0 && (
                    <ul className="servant-kids__history">
                      {b.history.map((h, i) => (
                        <li key={i}>
                          <span className="servant-kids__hdate">
                            {formatShort(h.date)}
                          </span>
                          <Badge kind="navy">{followLabel(h.status)}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
