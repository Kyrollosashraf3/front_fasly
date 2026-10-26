import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/Button'
import { calcAge } from '../../lib/format'
import { BoyName } from './BoyName'
import { NoteCell } from './boyBits'

/** Table columns for the boys list. */
export function boysColumns({
  classId,
  multi,
  classLabel,
  canManageBoys,
  canWrite,
  setViewing,
  openEdit,
  remove,
  refetch,
}) {
  return [
    {
      key: 'boy_name',
      label: 'الاسم',
      mobile: 'الاسم',
      render: (b) => <BoyName boy={b} className="table__name" classId={classId} onSaved={refetch} />,
    },
    ...(multi
      ? [
          {
            key: 'class',
            label: 'الفصل',
            width: 150,
            mobile: 'الفصل',
            sortValue: (b) => classLabel(b.class_id),
            render: (b) => <span className="small muted">{classLabel(b.class_id)}</span>,
          },
        ]
      : []),
    {
      key: 'gender',
      label: 'النوع',
      width: 80,
      mobile: 'النوع',
      sortValue: (b) => (b.gender === 'f' ? 'بنت' : 'ولد'),
      render: (b) => (b.gender === 'f' ? 'بنت' : 'ولد'),
    },
    {
      key: 'age',
      label: 'السن',
      width: 70,
      mobile: 'السن',
      sortValue: (b) => calcAge(b.birth_date),
      render: (b) => calcAge(b.birth_date) ?? '—',
    },
    {
      key: 'phone',
      label: 'التليفون',
      width: 140,
      mobile: 'التليفون',
      render: (b) =>
        b.phone ? (
          <a className="ltr" style={{ display: 'block', textAlign: 'center' }} href={`tel:${b.phone}`}>
            {b.phone}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'note', label: 'ملاحظة', mobile: 'ملاحظة', render: (b) => <NoteCell note={b.note} /> },
    {
      key: 'actions',
      label: '',
      width: 130,
      align: 'end',
      mobile: '',
      sortable: false,
      render: (b) => (
        <div className="table__actions">
          <IconButton icon={<Icon name="eye" size={16} />} label="عرض" onClick={() => setViewing(b)} />
          {canManageBoys && (
            <IconButton icon={<Icon name="edit" size={16} />} label="تعديل" onClick={() => openEdit(b)} />
          )}
          {canWrite && (
            <IconButton
              icon={<Icon name="trash" size={16} />}
              label="حذف"
              danger
              onClick={() => remove(b)}
            />
          )}
        </div>
      ),
    },
  ]
}
