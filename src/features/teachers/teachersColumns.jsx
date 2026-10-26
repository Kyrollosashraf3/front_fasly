import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/Button'
import { ContactActions } from '../../components/ui/ContactActions'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../lib/format'
import { NoteCell } from '../boys/boyBits'

/** Table columns for the servants directory. */
export function teachersColumns({ multi, classLabel, canWrite, openEdit, remove }) {
  return [
    {
      key: 'teacher_name',
      label: 'الاسم',
      mobile: 'الاسم',
      render: (t) => <span className="table__name">{t.teacher_name}</span>,
    },
    ...(multi
      ? [
          {
            key: 'class',
            label: 'الفصل',
            width: 150,
            mobile: 'الفصل',
            sortValue: (t) => classLabel(t.class_id),
            render: (t) => <span className="small muted">{classLabel(t.class_id)}</span>,
          },
        ]
      : []),
    {
      key: 'phone',
      label: 'التليفون',
      width: 150,
      mobile: 'التليفون',
      render: (t) =>
        t.phone ? (
          <a className="ltr" style={{ display: 'block', textAlign: 'center' }} href={`tel:${t.phone}`}>
            {t.phone}
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'contact',
      label: 'تواصل',
      width: 96,
      align: 'center',
      mobile: 'تواصل',
      sortable: false,
      render: (t) => <ContactActions phone={t.phone} phone2={t.phone_2} />,
    },
    {
      key: 'last_visit_date',
      label: 'آخر اعتراف / زيارة',
      width: 170,
      mobile: 'آخر زيارة',
      sortValue: (t) => t.last_visit_date || null,
      render: (t) =>
        t.last_visit_date ? (
          <span className="row" style={{ gap: 6 }}>
            <Icon name="calendar" size={14} />
            {formatDate(t.last_visit_date, { withDay: false })}
          </span>
        ) : (
          <Badge kind="neutral">لم يُسجّل</Badge>
        ),
    },
    { key: 'note', label: 'ملاحظة', mobile: 'ملاحظة', render: (t) => <NoteCell note={t.note} /> },
    {
      key: 'actions',
      label: '',
      width: 90,
      align: 'end',
      mobile: '',
      sortable: false,
      render: (t) =>
        canWrite ? (
          <div className="table__actions">
            <IconButton icon={<Icon name="edit" size={16} />} label="تعديل" onClick={() => openEdit(t)} />
            <IconButton icon={<Icon name="trash" size={16} />} label="حذف" danger onClick={() => remove(t)} />
          </div>
        ) : (
          <span className="muted xsmall">—</span>
        ),
    },
  ]
}
