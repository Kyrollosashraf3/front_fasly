import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { Avatar } from '../../components/ui/Avatar'
import { Table } from '../../components/ui/Table'
import { BoyName } from '../boys/BoyName'
import { followLabel } from '../boys/BoyProfile'
import { formatShort } from '../../lib/format'

/** One card's boy table, sortable through the shared Table headers. */
function BoyTable({ boys, classId, canWrite, editing, onView, onUnassign, onMove, refetch }) {
  const columns = [
    {
      key: 'boy_name',
      label: 'الاسم',
      mobile: 'الاسم',
      sortValue: (b) => b.boy_name,
      render: (b) => <BoyName boy={b} className="table__name" classId={classId} onSaved={refetch} />,
    },
    {
      key: 'phone',
      label: 'التليفون',
      width: 140,
      align: 'center',
      mobile: 'التليفون',
      sortValue: (b) => b.phone || null,
      render: (b) => <span className="ltr">{b.phone || '—'}</span>,
    },
    {
      key: 'percent',
      label: 'الحضور',
      width: 200,
      mobile: 'الحضور',
      sortValue: (b) => b.percent,
      render: (b) =>
        b.percent !== null && b.percent !== undefined ? (
          <span className="row" style={{ gap: 8 }}>
            <span className="group-att">
              <span className="group-att__fill" style={{ width: `${b.percent}%` }} />
            </span>
            <span className="xsmall bold nowrap">
              {b.present}/{b.total ?? b.present + b.absent} ({b.percent}%)
            </span>
          </span>
        ) : (
          <span className="muted xsmall">—</span>
        ),
    },
    {
      key: 'last_followup',
      label: 'آخر افتقاد',
      width: 190,
      mobile: 'آخر افتقاد',
      sortValue: (b) => b.last_followup?.action_date || null,
      render: (b) =>
        b.last_followup ? (
          <span className="row" style={{ gap: 6 }}>
            <span className="badge badge--blue">{followLabel(b.last_followup.status)}</span>
            <span className="xsmall muted">{formatShort(b.last_followup.action_date)}</span>
          </span>
        ) : (
          <span className="muted xsmall">—</span>
        ),
    },
    {
      key: 'note',
      label: 'ملاحظات',
      mobile: 'ملاحظات',
      sortValue: (b) => b.note || null,
      render: (b) => <span className="muted small">{b.note || '—'}</span>,
    },
    {
      key: 'actions',
      label: '',
      width: 130,
      align: 'end',
      mobile: '',
      sortable: false,
      render: (b) => (
        <div className="table__actions">
          <IconButton icon={<Icon name="eye" size={16} />} label="عرض الملف" onClick={() => onView(b)} />
          {canWrite && editing && (
            <>
              <IconButton
                icon={<Icon name="edit" size={16} />}
                label="نقل لمجموعة أخرى"
                onClick={() => onMove({ ...b, inGroup: true })}
              />
              <IconButton
                icon={<Icon name="close" size={16} />}
                label="إلغاء التوزيع"
                danger
                onClick={() => onUnassign(b)}
              />
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      rows={boys}
      rowKey={(b) => b.boy_id}
      compact
      stackOnMobile
      className="group-table"
    />
  )
}

/** One card per servant plus the "بدون مجموعة" card below them. */
export function GroupCards({ groups }) {
  const {
    visibleGroups,
    unassigned,
    canWrite,
    effectiveClassId,
    refetch,
    setViewing,
    unassign,
    unassignMany,
    setBoyMove,
    editing,
  } = groups

  const tableProps = {
    classId: effectiveClassId,
    canWrite,
    editing,
    onView: setViewing,
    onUnassign: unassign,
    onMove: setBoyMove,
    refetch,
  }

  const total = visibleGroups.reduce((n, g) => n + g.boys.length, 0) + unassigned.length
  if (total === 0) {
    return (
      <EmptyState
        icon="groups"
        title="لا توجد أولاد للعرض"
        message="جرب تغير الفلتر أو وزّع الأولاد من لوحة التوزيع."
      />
    )
  }

  return (
    <div className="group-list">
      {visibleGroups.map((g) => (
        <section key={g.teacher_id} className="group-card card">
          <div className="group-card__head">
            <div className="row">
              <Avatar name={g.teacher_name} size="md" />
              <div>
                <div className="group-card__name">{g.teacher_name}</div>
                <div className="xsmall muted">
                  {g.phone ? <span className="ltr">{g.phone}</span> : 'بدون تليفون'}
                  {' · '}
                  {g.boys.length} ولد
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {canWrite && editing && g.boys.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Icon name="edit" size={14} />}
                    onClick={() => groups.editGroup(g.teacher_id)}
                  >
                    تعديل المجموعة
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => unassignMany(g.boys)}>
                    إلغاء الكل
                  </Button>
                </>
              )}
            </div>
          </div>

          {g.boys.length === 0 ? (
            <div className="card__body">
              <p className="small muted">لا يوجد أولاد في مجموعة الخادم ده.</p>
            </div>
          ) : (
            <BoyTable boys={g.boys} {...tableProps} />
          )}
        </section>
      ))}

      {unassigned.length > 0 && (
        <section className="group-card card group-card--empty">
          <div className="group-card__head">
            <div className="row">
              <span className="group-card__icon">
                <Icon name="boys" size={20} />
              </span>
              <div>
                <div className="group-card__name">بدون مجموعة</div>
                <div className="xsmall muted">{unassigned.length} ولد لسه ماتوزّعوش</div>
              </div>
            </div>
          </div>
          <BoyTable boys={unassigned} {...tableProps} />
        </section>
      )}
    </div>
  )
}
