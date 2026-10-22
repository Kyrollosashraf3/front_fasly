import { Icon } from '../../components/ui/Icon'
import { FLAGS } from './constants'

/** Columns of the servant check sheet: name, five flags, note. */
export function checkColumns({ sheet, canWrite }) {
  const { getMark, setFlag, askNote } = sheet

  return [
    {
      key: 'teacher_name',
      label: 'الخادم',
      mobile: 'الخادم',
      render: (t) => (
        <div className="check-person">
          <span className="table__name">{t.teacher_name}</span>
          {t.phone && <span className="xsmall muted ltr">{t.phone}</span>}
        </div>
      ),
    },
    ...FLAGS.map((f) => ({
      key: f.key,
      label: f.label,
      width: 110,
      align: 'center',
      mobile: f.label,
      render: (t) => (
        <input
          key={f.key}
          type="checkbox"
          className="att-check"
          aria-label={`${f.label}: ${t.teacher_name}`}
          checked={Boolean(getMark(t.id)[f.key])}
          disabled={!canWrite}
          onChange={(e) => setFlag(t.id, f.key, e.target.checked)}
        />
      ),
    })),
    {
      key: 'note',
      label: 'ملاحظة',
      width: 200,
      mobile: 'ملاحظة',
      render: (t) => {
        const note = getMark(t.id).note
        if (!canWrite) return note ? <span className="small">{note}</span> : <span className="muted xsmall">—</span>
        return (
          <button type="button" className="note-btn" onClick={() => askNote(t)} title="إضافة ملاحظة">
            <Icon name="note" size={15} className={note ? 'note-indicator' : ''} />
            <span className="small truncate" style={{ maxWidth: 130 }}>
              {note || 'أضف'}
            </span>
          </button>
        )
      },
    },
  ]
}
