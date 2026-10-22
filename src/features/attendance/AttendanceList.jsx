import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { AttMark } from './AttMark'

/** The sheet's table: name, the two chips and the per-row edit controls. */
export function AttendanceList({ sheet, classId, canWrite, canAdd, onAddBoy }) {
  const {
    loading,
    error,
    refetch,
    data,
    rows,
    getMark,
    setMark,
    isLocked,
    rowChanged,
    saveRow,
    cancelRow,
    editing,
    setEditing,
    rowSaving,
    previousAbsent,
  } = sheet

  const columns = [
    {
      key: 'boy_name',
      label: 'الاسم',
      // A capped name column keeps the tick chips right beside the name on a
      // desktop sheet instead of stranded in the middle of a wide table.
      width: 280,
      // no label on the phone card — the name speaks for itself
      mobile: '',
      render: (b) => (
        <span className="table__name">
          <BoyName boy={b} classId={classId} onSaved={refetch} />
          {previousAbsent.has(b.id) && (
            <span
              className="att-absent-x"
              title="غاب الجمعة اللي فاتت"
              aria-label="غاب الجمعة اللي فاتت"
            >
              ✕
            </span>
          )}
        </span>
      ),
    },
    ...(canWrite
      ? [
          {
            key: 'marks',
            label: '',
            align: 'start',
            mobile: '',
            render: (b) => {
              const locked = isLocked(b.id)
              const rowEdit = editing.has(b.id)
              return (
                <div className="att-marks">
                  <AttMark
                    type="present"
                    checked={getMark(b.id).present}
                    disabled={locked}
                    // un-ticking presence also un-ticks the mass (mass implies presence)
                    onToggle={(v) =>
                      setMark(b.id, v ? { present: true } : { present: false, liturgy: false })
                    }
                  />
                  <AttMark
                    type="liturgy"
                    checked={Boolean(getMark(b.id).liturgy)}
                    disabled={locked}
                    // ticking the mass ticks presence too — you can't attend mass and be absent
                    onToggle={(v) =>
                      setMark(b.id, v ? { liturgy: true, present: true } : { liturgy: false })
                    }
                  />

                  {locked && (
                    <IconButton
                      icon={<Icon name="edit" size={15} />}
                      label="تعديل"
                      onClick={() =>
                        setEditing((s) => {
                          const next = new Set(s)
                          next.add(b.id)
                          return next
                        })
                      }
                    />
                  )}

                  {rowEdit && (
                    <>
                      <IconButton
                        icon={<Icon name="check" size={16} />}
                        label="حفظ تعديل الولد"
                        disabled={rowSaving === b.id || !rowChanged(b.id)}
                        onClick={() => saveRow(b.id)}
                      />
                      <IconButton
                        icon={<Icon name="close" size={15} />}
                        label="إلغاء التعديل"
                        onClick={() => cancelRow(b.id)}
                      />
                    </>
                  )}
                </div>
              )
            },
          },
        ]
      : []),
  ]

  // `!classId` covers the moment before the super admin's classes arrive.
  const busy = loading || !classId
  const noRecords = !busy && (data?.boys || []).length === 0

  if (busy) return <SkeletonRows rows={8} cols={4} />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (noRecords)
    return (
      <EmptyState
        icon="boys"
        title="لا يوجد أولاد في الفصل"
        message="ضيف الأولاد الأول عشان تقدر تسجّل الحضور."
        action={
          canAdd ? (
            <div className="row" style={{ gap: 10 }}>
              <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={onAddBoy}>
                إضافة ولد
              </Button>
              <a className="btn btn-secondary" href={`#/class/${classId}/boys`}>
                بيانات الأولاد
              </a>
            </div>
          ) : null
        }
      />
    )
  if (rows.length === 0)
    return (
      <EmptyState
        icon="search"
        title="لا توجد نتائج"
        message="جرّب بحثًا مختلفًا أو غيّر الفلتر."
        inline
      />
    )

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(b) => b.id}
      rowClassName={(b) => (getMark(b.id).present ? 'is-present' : '')}
      stackOnMobile
      className="att-table"
    />
  )
}
