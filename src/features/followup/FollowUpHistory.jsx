import { useMemo } from 'react'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useQuery } from '../../hooks'
import { FollowUpAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { followLabel } from '../boys/BoyProfile'
import { formatDate } from '../../lib/format'
import { KIND } from './constants'

/** The «السجل السابق» section: the class's logged follow-ups, filtered. */
export function FollowUpHistory({ sheet, classId, canDelete }) {
  const toast = useToast()
  const modal = useModal()
  const {
    teacherId,
    historyDate,
    setHistoryDate,
    roster,
    refetch,
    nameOfTeacher,
    canWrite,
    revision,
  } = sheet

  const { data: history, loading: historyLoading, refetch: refetchHistory } = useQuery(
    () =>
      FollowUpAPI.list({
        class_id: classId,
        ...(teacherId ? { teacher_id: teacherId } : {}),
        ...(historyDate ? { action_date: historyDate } : {}),
      }),
    [classId, teacherId, historyDate, revision],
    { enabled: Boolean(classId) },
  )

  const historyRows = useMemo(() => (history || []).slice(0, 50), [history])

  const nameOfBoy = (id) => roster.find((b) => b.id === id)?.boy_name || `ولد #${id}`
  /** The same row as a record, so its name cell carries the ✎ marker. */
  const boyOf = (id) => roster.find((b) => b.id === id) || { id, boy_name: nameOfBoy(id) }

  const editHistory = async (row) => {
    const next = await modal.prompt({ title: 'تعديل الملاحظة', value: row.note || '' })
    if (next === null) return
    try {
      await FollowUpAPI.update(row.id, { note: next })
      toast.success('تم التعديل.')
      refetchHistory()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const deleteHistory = async (row) => {
    const ok = await modal.confirm({ title: 'حذف هذا الافتقاد؟', confirmLabel: 'حذف' })
    if (!ok) return
    try {
      await FollowUpAPI.remove(row.id)
      toast.success('تم الحذف.')
      refetchHistory()
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const historyColumns = [
    { key: 'action_date', label: 'تاريخ الافتقاد', width: 130, mobile: 'تاريخ الافتقاد', render: (r) => formatDate(r.action_date, { withDay: false }) },
    { key: 'teacher_id', label: 'الخادم', width: 150, mobile: 'الخادم', render: (r) => nameOfTeacher(r.teacher_id) },
    { key: 'boy_id', label: 'الولد', mobile: 'الولد', render: (r) => <BoyName boy={boyOf(r.boy_id)} classId={classId} onSaved={refetchHistory} /> },
    {
      key: 'status',
      label: 'الطريقة',
      width: 130,
      mobile: 'الطريقة',
      render: (r) => <Badge kind={KIND[r.status] || 'neutral'}>{followLabel(r.status)}</Badge>,
    },
    { key: 'note', label: 'الملاحظات', mobile: 'الملاحظات', render: (r) => r.note || <span className="muted xsmall">—</span> },
    {
      key: 'actions',
      label: '',
      width: 90,
      align: 'end',
      mobile: '',
      render: (r) =>
        canWrite ? (
          <div className="table__actions">
            <IconButton icon={<Icon name="edit" size={15} />} label="تعديل" onClick={() => editHistory(r)} />
            {canDelete && (
              <IconButton icon={<Icon name="trash" size={15} />} label="حذف" danger onClick={() => deleteHistory(r)} />
            )}
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <div className="section-title">السجل السابق</div>
      <Toolbar className="toolbar--static">
        <label className="row small bold" style={{ gap: 8 }}>
          <Icon name="filter" size={15} />
          <Input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            style={{ width: 160 }}
          />
        </label>
        {historyDate && (
          <Button variant="ghost" size="sm" onClick={() => setHistoryDate('')}>
            مسح الفلتر
          </Button>
        )}
        <ToolbarSpacer />
        <span className="small muted">{history?.length ?? 0} سجل</span>
      </Toolbar>

      <div style={{ marginTop: 'var(--sp-3)' }}>
        {historyLoading ? (
          <SkeletonRows rows={5} cols={6} />
        ) : !historyRows.length ? (
          <EmptyState icon="heart" title="لا يوجد سجل" message="لسه مفيش افتقادات مسجّلة." inline />
        ) : (
          <Table columns={historyColumns} rows={historyRows} rowKey={(r) => r.id} stackOnMobile compact />
        )}
      </div>
    </>
  )
}
