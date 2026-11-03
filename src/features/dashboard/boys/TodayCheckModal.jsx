import { useQuery } from '../../../hooks'
import { DashboardAPI } from '../../../lib/endpoints'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { ErrorState, Loading } from '../../../components/ui/States'
import { formatDate } from '../../../lib/format'

/** One named list: the liturgy, or the reciters of one competition. */
function CheckBox({ title, note, boys }) {
  return (
    <section className="check-box">
      <header className="check-box__head">
        <span className="check-box__title">{title}</span>
        <span className={`check-box__count${boys.length ? ' is-live' : ''}`}>
          {boys.length}
        </span>
      </header>
      {note && <div className="check-box__note">{note}</div>}
      {boys.length === 0 ? (
        <div className="check-box__empty">لسه مفيش تسجيلات النهاردة.</div>
      ) : (
        <ol className="check-box__names">
          {boys.map((boy) => (
            <li key={boy.boy_id}>
              <span className="truncate">{boy.boy_name}</span>
              {boy.class_name && <span className="check-box__class">{boy.class_name}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * TodayCheckModal — «فحص اليوم».
 *
 * Who stood in today's liturgy, then one box per active competition holding
 * the boys who recited it today. The export button writes exactly these boxes
 * into one sheet, in this order.
 */
export function TodayCheckModal({ open, onClose, classId }) {
  const params = classId ? { class_id: classId } : {}
  const { data, loading, error, refetch } = useQuery(
    () => DashboardAPI.todayCheck(params),
    [classId],
    { enabled: open },
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="فحص اليوم"
      sub={data ? formatDate(data.date) : 'النهاردة'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            قفل
          </Button>
          <Button
            variant="primary"
            icon={<Icon name="download" size={16} />}
            onClick={() => DashboardAPI.exportTodayCheck(params)}
          >
            تصدير الكل في شيت
          </Button>
        </>
      }
    >
      {loading && !data ? (
        <Loading label="جارٍ التحميل..." />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="تعذّر تحميل فحص اليوم" />
      ) : !data ? null : (
        <div className="check-grid">
          <CheckBox
            title="حضور قداس النهاردة"
            boys={data.liturgy.boys}
          />
          {data.tasks.map((task) => (
            <CheckBox
              key={task.task_id}
              title={`مسابقة: ${task.task_name}`}
              note={`${task.value} طايو للتسميع`}
              boys={task.boys}
            />
          ))}
          {data.tasks.length === 0 && (
            <div className="check-box check-box--bare">
              مفيش مسابقات عاملة دلوقتي — اعملها من صفحة المسابقات.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
