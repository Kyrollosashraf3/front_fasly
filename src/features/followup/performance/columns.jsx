import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Progress } from '../../../components/ui/Avatar'
import { Icon } from '../../../components/ui/Icon'
import { BoyName } from '../../boys/BoyName'
import { followLabel } from '../../boys/BoyProfile'
import { FollowedBadge, TodoBadge } from '../../dashboard/parts'
import { formatShort } from '../../../lib/format'

/** Table columns for the ranked boys list. */
export function boyColumns({ data, refetch, expanded, setExpanded, setHistoryBoy }) {
  return [
    {
      key: 'boy_name',
      label: 'الولد',
      mobile: 'الولد',
      sortValue: (r) => r.boy_name,
      render: (r) => (
        <span className="name-list__main">
          <span className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <BoyName
              boy={{ id: r.boy_id, boy_name: r.boy_name, class_id: r.class_id }}
              className="table__name"
              classId={r.class_id}
              onSaved={refetch}
            />
            {r.boy_phone && (
              <>
                <a href={`tel:${r.boy_phone}`} aria-label="اتصل بالولد" className="icon-link">
                  <Icon name="phone" size={14} />
                </a>
                <a
                  href={`https://wa.me/${String(r.boy_phone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="واتساب الولد"
                  className="icon-link"
                >
                  <Icon name="whatsapp" size={14} />
                </a>
              </>
            )}
          </span>
          {!data?.scope?.single_class && <span className="muted xsmall">{r.class_name}</span>}
        </span>
      ),
    },
    {
      key: 'servant_name',
      label: 'الخادم المسؤول',
      width: 170,
      mobile: 'الخادم المسؤول',
      sortValue: (r) => r.servant_name || '',
      render: (r) => (
        <span className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{r.servant_name || <span className="muted xsmall">بدون مجموعة</span>}</span>
          {r.servant_phone && (
            <>
              <a href={`tel:${r.servant_phone}`} aria-label="اتصل" className="icon-link">
                <Icon name="phone" size={14} />
              </a>
              <a
                href={`https://wa.me/${String(r.servant_phone).replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="واتساب"
                className="icon-link"
              >
                <Icon name="whatsapp" size={14} />
              </a>
            </>
          )}
        </span>
      ),
    },
    {
      key: 'count',
      label: 'عدد الافتقادات',
      width: 118,
      align: 'center',
      mobile: 'عدد الافتقادات',
      sortValue: (r) => r.count,
      render: (r) => (r.followed ? <FollowedBadge count={r.count} /> : <TodoBadge />),
    },
    {
      key: 'last_date',
      label: 'آخر افتقاد',
      width: 116,
      mobile: 'آخر افتقاد',
      sortValue: (r) => r.last_date || '',
      render: (r) => (r.last_date ? formatShort(r.last_date) : <span className="muted xsmall">—</span>),
    },
    {
      key: 'last_status',
      label: 'الطريقة',
      width: 116,
      mobile: 'الطريقة',
      sortValue: (r) => (r.last_status ? followLabel(r.last_status) : null),
      render: (r) => (r.last_status ? <Badge kind="navy">{followLabel(r.last_status)}</Badge> : <span className="muted xsmall">—</span>),
    },
    {
      key: 'last_note',
      label: 'ملاحظات',
      width: 160,
      mobile: 'ملاحظات',
      sortValue: (r) => r.last_note || r.note || null,
      render: (r) => (r.last_note || r.note) || <span className="muted xsmall">—</span>,
    },
    {
      key: 'last_by_name',
      label: 'سجّله',
      width: 150,
      mobile: 'سجّله',
      sortValue: (r) => r.last_by_name || null,
      render: (r) => r.last_by_name || <span className="muted xsmall">—</span>,
    },
    {
      key: 'details',
      label: '',
      width: 150,
      align: 'end',
      mobile: '',
      sortable: false,
      render: (r) => (
        <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
          {r.count > 0 && (
            <button
              type="button"
              className={`att-details${expanded === r.boy_id ? ' is-open' : ''}`}
              aria-expanded={expanded === r.boy_id}
              onClick={() => setExpanded(expanded === r.boy_id ? null : r.boy_id)}
            >
              السجل
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setHistoryBoy(r)}>
            تاريخ الافتقاد
          </Button>
        </div>
      ),
    },
  ]
}

/** Table columns for the servants coverage list. */
export function servantColumns(data, { onOpenBoys } = {}) {
  const countCell = (s, kind, count) => (
    <button
      type="button"
      className={`servant-kids${kind === 'outside' ? ' servant-kids--outside' : ''}`}
      onClick={() => onOpenBoys?.(s, kind)}
      aria-label={
        kind === 'outside'
          ? `عرض أولاد خارج مجموعة ${s.teacher_name} (${count})`
          : `عرض أولاد مجموعة ${s.teacher_name} الذين افتقدهم (${count})`
      }
    >
      {count}
    </button>
  )

  return [
    {
      key: 'teacher_name',
      label: 'الخادم',
      mobile: 'الخادم',
      sortValue: (s) => s.teacher_name,
      render: (s) => (
        <span className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
          <span className="table__name">{s.teacher_name}</span>
          {s.phone && (
            <>
              <a href={`tel:${s.phone}`} aria-label="اتصل" className="icon-link">
                <Icon name="phone" size={14} />
              </a>
              <a
                href={`https://wa.me/${String(s.phone).replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="واتساب"
                className="icon-link"
              >
                <Icon name="whatsapp" size={14} />
              </a>
            </>
          )}
        </span>
      ),  
    },
    ...(data?.scope?.single_class
      ? []
      : [
          {
            key: 'class_name',
            label: 'الفصل',
            width: 140,
            mobile: 'الفصل',
            sortValue: (s) => s.class_name || '',
            render: (s) => s.class_name || s.class_id,
          },
        ]),
    {
      key: 'inside_count',
      label: 'افتقد من مجموعته',
      width: 126,
      align: 'center',
      mobile: 'افتقد من مجموعته',
      sortValue: (s) => s.inside_count || 0,
      render: (s) => countCell(s, 'inside', s.inside_count || 0),
    },
    {
      key: 'outside_count',
      label: 'افتقد خارج مجموعته',
      width: 132,
      align: 'center',
      mobile: 'افتقد خارج مجموعته',
      sortValue: (s) => s.outside_count || 0,
      render: (s) => countCell(s, 'outside', s.outside_count || 0),
    },
    {
      key: 'group_size',
      label: 'حجم المجموعة',
      width: 104,
      align: 'center',
      mobile: 'حجم المجموعة',
      sortValue: (s) => s.group_size,
      render: (s) => (s.group_size ? s.group_size : <span className="muted xsmall">0</span>),
    },
    {
      key: 'percent',
      label: 'تغطية المجموعة',
      width: 180,
      mobile: 'تغطية المجموعة',
      sortValue: (s) => s.percent,
      render: (s) =>
        s.group_size ? (
          <Progress value={s.percent} label={`${Math.round(s.percent)}%`} />
        ) : (
          <span className="muted xsmall">بدون أولاد</span>
        ),
    },
    {
      key: 'last',
      label: 'آخر افتقاد',
      width: 116,
      mobile: 'آخر افتقاد',
      sortValue: (s) => s.last || '',
      render: (s) => (s.last ? formatShort(s.last) : <span className="muted xsmall">—</span>),
    },
    {
      key: 'active',
      label: 'الحالة',
      width: 106,
      mobile: 'الحالة',
      sortValue: (s) => (s.active ? 1 : 0),
      render: (s) => (s.active ? <Badge kind="green">افتقد</Badge> : <Badge kind="red">لم يفتقد</Badge>),
    },
  ]
}
