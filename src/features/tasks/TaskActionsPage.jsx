import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '../../context/TitleContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, Loading } from '../../components/ui/States'
import { TaskAPI } from '../../lib/endpoints'
import { formatDate } from '../../lib/format'
import RegisterRecitation from './RegisterRecitation'
import TaskDues from './TaskDues'
import './tasks.css'

const ACTIONS = [
  {
    key: 'recitation',
    label: 'تسجيل تسميع',
    hint: 'ولد سمّع المسابقة — سجّله وحدّد هل استلم الطايو',
    icon: 'plus',
    write: true,
  },
  {
    key: 'dues',
    label: 'المستحقات',
    hint: 'مين لسه ما استلمش طايو',
    icon: 'trophy',
    write: true,
  },
]

/**
 * TaskActionsPage — the page a competition box opens.
 *
 * The two actions are laid out as page tiles, not inside a card, exactly like
 * the trip page: the servant lands on the task first, sees its طايو value, and
 * only then chooses to register a recitation or hand out what is owed.
 */
export default function TaskActionsPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { can, user } = useAuth()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState(null)

  usePageTitle(task?.task_name || 'المسابقات')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTask(await TaskAPI.get(taskId))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  const action = useMemo(() => {
    const found = ACTIONS.find((item) => item.key === view) || null
    if (found?.write && !can.writeRecitations(user)) return null
    return found
  }, [view, can, user])
  const back = () => navigate('/tasks')
  const close = () => setView(null)

  return (
    <>
      <div className="page-head tasks__head">
        <div>
          <Button variant="ghost" size="sm" className="tasks__back" onClick={back}>
            <Icon name="chevronStart" size={15} />
            المسابقات
          </Button>
          {task && (
            <div className="page-head__sub tasks__task-meta">
              <Badge kind={task.status === 'inactive' ? 'neutral' : 'green'}>
                {String(task.status || 'active').toUpperCase()}
              </Badge>
              <span>
                {formatDate(task.created_at)} — {task.value} طايو للتسميع
              </span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Loading label="جارٍ تحميل المسابقة..." />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : (
        <div className="tasks__detail">
          <div className="tasks__detail-value">
            <span>مكافأة التسميع الواحد</span>
            <strong>{task.value} طايو</strong>
          </div>

          <div className="tasks__actions tasks__actions--page">
            {ACTIONS.filter((item) => !item.write || can.writeRecitations(user)).map((item) => (
              <button
                key={item.key}
                type="button"
                className="tasks__action"
                onClick={() => setView(item.key)}
              >
                <span className="tasks__action-icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="tasks__action-text">
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {action && task && (
        <Modal
          open
          onClose={close}
          size={action.key === 'recitation' ? 'md' : 'lg'}
          title={action.label}
          sub={task.task_name}
          footer={
            action.key === 'recitation' ? null : (
              <Button variant="secondary" onClick={close}>
                إغلاق
              </Button>
            )
          }
        >
          {action.key === 'recitation' && (
            <RegisterRecitation task={task} onSaved={close} onClose={close} />
          )}

          {action.key === 'dues' && <TaskDues task={task} />}
        </Modal>
      )}
    </>
  )
}
