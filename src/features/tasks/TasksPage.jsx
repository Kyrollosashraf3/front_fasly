import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { TaskAPI } from '../../lib/endpoints'
import { TaskDialog } from './TaskDialog'
import './tasks.css'

/**
 * TasksPage — "المسابقات".
 *
 * Competitions are poster-like boxes exactly like the trips: the box carries
 * the task name and its طايو reward, clicking it opens the task's actions
 * page, and the amin gets a hover edit button. An amin who answers for more than
 * one class can narrow the list to one of them, and the footer button swaps to
 * the stopped (inactive) competitions.
 */
export default function TasksPage() {
  usePageTitle('المسابقات')
  const { classes, isManager, canPickClass, allClassesLabel } = useAuth()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // The grid shows the active competitions by default; the footer button toggles it.
  const [status, setStatus] = useState('active')
  // A class filter only appears for an amin whose reach holds several classes;
  // '' means every class he answers for.
  const [classId, setClassId] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const viewingInactive = status === 'inactive'

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { status }
      if (classId) params.class_id = classId
      setTasks(await TaskAPI.list(params))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [status, classId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const activeClass = useMemo(
    () => classes.find((c) => String(c.id) === classId),
    [classes, classId],
  )

  const openCreate = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  const handleSaved = () => {
    // A new competition is active, so leave the old list to show it.
    if (!editingTask && viewingInactive) {
      setStatus('active')
      return
    }
    refetch()
  }

  const countLabel = viewingInactive
    ? tasks.length
      ? `${tasks.length} مسابقة قديمة`
      : 'لا توجد مسابقات قديمة'
    : tasks.length
      ? `${tasks.length} مسابقة نشطة`
      : 'المسابقات النشطة لفصلك'

  return (
    <>
      <div className="page-head tasks__head">
        <div>
          <div className="page-head__sub">
            {countLabel}
            {activeClass ? ` — ${activeClass.name}` : ''}
          </div>
        </div>
        {isManager && (
          <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
            إضافة مسابقة
          </Button>
        )}
      </div>

      {canPickClass && (
        <div className="tasks__filterbar">
          <label className="tasks__filter">
            <span className="tasks__filter-label">اختر الفصل</span>
            <Select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="اختر الفصل"
              searchable
              searchPlaceholder="ابحث باسم الفصل..."
            >
              <option value="">{allClassesLabel}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}

      {loading ? (
        <Loading label="جارٍ تحميل المسابقات..." />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={viewingInactive ? 'history' : 'trophy'}
          title={viewingInactive ? 'لا توجد مسابقات قديمة' : 'لا توجد مسابقات نشطة'}
          message={
            viewingInactive
              ? 'لم تُوقَف أي مسابقة قديمة لهذا الفصل بعد.'
              : 'لم تُفتح أي مسابقة فعالة لفصلك بعد.'
          }
          action={
            viewingInactive ? (
              <Button
                variant="secondary"
                icon={<Icon name="chevronStart" size={15} />}
                onClick={() => setStatus('active')}
              >
                العودة للمسابقات النشطة
              </Button>
            ) : (
              isManager && (
                <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
                  أضف أول مسابقة
                </Button>
              )
            )
          }
        />
      ) : (
        <div className={`tasks__grid${viewingInactive ? ' tasks__grid--inactive' : ''}`}>
          {tasks.map((task) => (
            <div className="tasks__task" key={task.id}>
              <button
                type="button"
                className="tasks__task-card"
                onClick={() => navigate(`/tasks/${task.id}`)}
                aria-label={`فتح مسابقة ${task.task_name}`}
              >
                <span className="tasks__task-art" aria-hidden="true">
                  <Icon name="trophy" size={62} />
                </span>
                <span className="tasks__task-name">{task.task_name}</span>
                <span className="tasks__task-value">{task.value} طايو</span>
              </button>

              {isManager && (
                <IconButton
                  className="tasks__task-edit"
                  icon={<Icon name="edit" size={15} />}
                  label={`تعديل ${task.task_name}`}
                  onClick={() => openEdit(task)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="tasks__footer">
          <Button
            variant="ghost"
            size="sm"
            className="tasks__old-toggle"
            icon={<Icon name={viewingInactive ? 'refresh' : 'history'} size={15} />}
            onClick={() => setStatus(viewingInactive ? 'active' : 'inactive')}
          >
            {viewingInactive ? 'العودة للمسابقات النشطة' : 'المسابقات القديمة (INACTIVE)'}
          </Button>
        </div>
      )}

      {formOpen && (
        <TaskDialog
          key={editingTask?.id ?? 'new'}
          task={editingTask}
          classes={classes}
          canChooseClass={canPickClass}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
