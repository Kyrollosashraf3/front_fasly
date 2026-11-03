import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../../../context/TitleContext'
import { useQuery } from '../../../hooks'
import { ClassAPI, DashboardAPI } from '../../../lib/endpoints'
import { formatDate } from '../../../lib/format'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Field, Select } from '../../../components/ui/Field'
import { Icon } from '../../../components/ui/Icon'
import { Table } from '../../../components/ui/Table'
import { Tabs, Toolbar, ToolbarSpacer } from '../../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../../components/ui/States'
import '../dashboard.css'

function CheckMark({ value }) {
  return (
    <span
      className={`today-check__mark ${value ? 'is-yes' : 'is-no'}`}
      aria-label={value ? 'نعم' : 'لا'}
      title={value ? 'نعم' : 'لا'}
    >
      <Icon name={value ? 'check' : 'close'} size={18} strokeWidth={2.4} />
    </span>
  )
}

const columns = [
  { key: 'boy_name', label: 'اسم الولد', mobile: 'اسم الولد' },
  {
    key: 'complete',
    label: 'الحالة',
    mobile: 'الحالة',
    align: 'center',
    sortValue: (row) => Number(row.complete),
    render: (row) => (
      <Badge kind={row.complete ? 'green' : 'red'}>
        {row.complete ? 'مكتمل' : 'غير مكتمل'}
      </Badge>
    ),
  },
  {
    key: 'present',
    label: 'حضور',
    mobile: 'حضور',
    align: 'center',
    sortValue: (row) => Number(row.present),
    render: (row) => <CheckMark value={row.present} />,
  },
  {
    key: 'liturgy',
    label: 'قداس',
    mobile: 'قداس',
    align: 'center',
    sortValue: (row) => Number(row.liturgy),
    render: (row) => <CheckMark value={row.liturgy} />,
  },
  {
    key: 'recited',
    label: 'تسميع',
    mobile: 'تسميع',
    align: 'center',
    sortValue: (row) => Number(row.recited),
    render: (row) => <CheckMark value={row.recited} />,
  },
]

export default function TodayCheckPage() {
  usePageTitle('فحص اليوم')
  const [classId, setClassId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [status, setStatus] = useState('all')

  const classesQuery = useQuery(() => ClassAPI.list(), [])
  const tasksQuery = useQuery(
    () => DashboardAPI.todayCheckTasks({ class_id: classId }),
    [classId],
    { enabled: Boolean(classId) },
  )
  const checkQuery = useQuery(
    () => DashboardAPI.todayCheck({ class_id: classId, task_id: taskId }),
    [classId, taskId],
    { enabled: Boolean(classId && taskId) },
  )

  const classes = classesQuery.data || []
  const tasks = classId && !tasksQuery.loading ? tasksQuery.data || [] : []
  const data = classId && taskId && !checkQuery.loading ? checkQuery.data : null
  const boys = data?.boys || []
  const rows = boys.filter((boy) => status === 'all' || boy.complete === (status === 'complete'))
  const completeCount = boys.filter((boy) => boy.complete).length

  const selectClass = (value) => {
    setClassId(value)
    setTaskId('')
    setStatus('all')
  }
  const selectTask = (value) => {
    setTaskId(value)
    setStatus('all')
  }

  let content
  if (classesQuery.loading) {
    content = <SkeletonRows rows={6} cols={5} />
  } else if (classesQuery.error) {
    content = <ErrorState error={classesQuery.error} onRetry={classesQuery.refetch} />
  } else if (!classId) {
    content = <EmptyState icon="groups" title="اختار المرحلة" message="اختار المرحلة الأول لعرض مسابقاتها وفحص أولادها." />
  } else if (tasksQuery.loading) {
    content = <SkeletonRows rows={6} cols={5} />
  } else if (tasksQuery.error) {
    content = <ErrorState error={tasksQuery.error} onRetry={tasksQuery.refetch} />
  } else if (!taskId) {
    content = tasks.length ? (
      <EmptyState icon="clipboard" title="اختار المسابقة" message="اختار مسابقة من مسابقات هذا الفصل لعرض الجدول." />
    ) : (
      <EmptyState icon="clipboard" title="لا توجد مسابقات" message="هذا الفصل لا يحتوي على مسابقات نشطة حاليًا." />
    )
  } else if (checkQuery.loading) {
    content = <SkeletonRows rows={6} cols={5} />
  } else if (checkQuery.error) {
    content = <ErrorState error={checkQuery.error} onRetry={checkQuery.refetch} title="تعذّر تحميل فحص اليوم" />
  } else if (!rows.length) {
    content = (
      <EmptyState
        icon="boys"
        title={boys.length ? 'لا توجد نتائج' : 'لا يوجد أولاد'}
        message={boys.length ? 'لا يوجد أولاد مطابقون لهذا الفلتر.' : 'لا توجد أسماء أولاد في هذا الفصل.'}
      />
    )
  } else {
    content = <Table columns={columns} rows={rows} rowKey={(boy) => boy.boy_id} stackOnMobile />
  }

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <Link to="/dashboard/boys">أداء الأولاد</Link>
            <span aria-hidden="true">/</span>
            <span>فحص اليوم</span>
          </nav>
          <div className="page-head__sub">
            {data ? `${data.class_name} — ${data.task_name} — ${formatDate(data.date)}` : 'حضور وقداس وتسميع النهاردة'}
          </div>
        </div>
        <Link className="btn btn-secondary" to="/dashboard/boys">
          <Icon name="chevronStart" size={15} />
          رجوع
        </Link>
      </div>

      <Toolbar className="today-check__toolbar">
        <div className="today-check__filters">
          <Field label="اختر المرحلة">
            <Select
              value={classId}
              onChange={(event) => selectClass(event.target.value)}
              disabled={classesQuery.loading}
              searchable
              searchPlaceholder="ابحث باسم المرحلة..."
              placeholder="اختار المرحلة"
            >
              <option value="">اختار المرحلة</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="اختر المسابقة المطلوبة">
            <Select
              value={taskId}
              onChange={(event) => selectTask(event.target.value)}
              disabled={!classId || tasksQuery.loading || !tasks.length}
              searchable
              searchPlaceholder="ابحث باسم المسابقة..."
              placeholder="اختار المسابقة"
            >
              <option value="">اختار المسابقة</option>
              {tasks.map((task) => (
                <option key={task.task_id} value={task.task_id}>
                  {task.task_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <ToolbarSpacer />
        <Button
          variant="primary"
          icon={<Icon name="download" size={16} />}
          disabled={!data || checkQuery.loading}
          onClick={() => DashboardAPI.exportTodayCheck({ class_id: classId, task_id: taskId, status })}
        >
          تنزيل شيت Excel
        </Button>
      </Toolbar>

      {data && (
        <div className="today-check__status">
          <Tabs
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'الكل', count: boys.length },
              { value: 'complete', label: 'مكتمل', count: completeCount },
              { value: 'incomplete', label: 'غير مكتمل', count: boys.length - completeCount },
            ]}
          />
        </div>
      )}

      <div className="today-check__content">{content}</div>
    </>
  )
}
