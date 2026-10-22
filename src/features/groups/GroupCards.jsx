import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { Avatar } from '../../components/ui/Avatar'
import { BoyName } from '../boys/BoyName'
import { followLabel } from '../boys/BoyProfile'
import { formatShort } from '../../lib/format'

const HEADERS = ['الاسم', 'التليفون', 'الحضور', 'آخر افتقاد', 'ملاحظات', '']
const UNASSIGNED_HEADERS = ['الاسم', 'التليفون', 'الحضور', 'آخر افتقاد', 'ملاحظات', '']

/** One table row; shared by the group cards and the unassigned card. */
function BoyRow({ b, classId, canWrite, editing, onView, onUnassign, onMove, refetch }) {
  return (
    <tr>
      <td>
        <BoyName boy={b} className="table__name" classId={classId} onSaved={refetch} />
      </td>
      <td className="ltr" style={{ textAlign: 'center' }}>
        {b.phone || '—'}
      </td>
      <td>
        {b.percent !== null && b.percent !== undefined ? (
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
        )}
      </td>
      <td>
        {b.last_followup ? (
          <span className="row" style={{ gap: 6 }}>
            <span className="badge badge--blue">{followLabel(b.last_followup.status)}</span>
            <span className="xsmall muted">{formatShort(b.last_followup.action_date)}</span>
          </span>
        ) : (
          <span className="muted xsmall">—</span>
        )}
      </td>
      <td className="muted small">{b.note || '—'}</td>
      <td>
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
      </td>
    </tr>
  )
}

function BoyTable({ boys, headers, classId, canWrite, editing, onView, onUnassign, onMove, refetch }) {
  return (
    <div className="table-wrap group-table">
      <table className="table table--compact">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: 'start' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {boys.map((b) => (
            <BoyRow
              key={b.boy_id}
              b={b}
              classId={classId}
              canWrite={canWrite}
              editing={editing}
              onView={onView}
              onUnassign={onUnassign}
              onMove={onMove}
              refetch={refetch}
            />
          ))}
        </tbody>
      </table>
    </div>
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
            <BoyTable boys={g.boys} headers={UNASSIGNED_HEADERS} {...tableProps} />
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
          <BoyTable boys={unassigned} headers={HEADERS} {...tableProps} />
        </section>
      )}
    </div>
  )
}
