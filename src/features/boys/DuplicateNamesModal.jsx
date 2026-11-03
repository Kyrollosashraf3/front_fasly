import { useState } from 'react'
import { useQuery } from '../../hooks'
import { Badge } from '../../components/ui/Badge'
import { IconButton, LinkButton } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { BoyAPI } from '../../lib/endpoints'
import { formatDate } from '../../lib/format'

const THRESHOLDS = [70, 75, 80, 85, 90, 95]

const SCOPES = [
  { value: 'all', label: 'كل الفصول' },
  { value: 'same_class', label: 'نفس الفصل' },
  { value: 'diff_class', label: 'فصلين مختلفين' },
]

/** What the server matched on, in the words a user acts on. */
const WHY = {
  spelling: 'كتابة مختلفة للاسم',
  nested_name: 'اسم ناقص أو زيادة اسم',
}

function groupNote(group) {
  const phones = group.members.map((m) => m.phone).filter(Boolean)
  if (phones.length > 1 && new Set(phones).size < phones.length) return 'نفس رقم التليفون'
  return null
}

/**
 * DuplicateNamesModal — the boys whose names look alike, handled one card at
 * a time. Read-only by design: it points at the edit and delete screens that
 * already exist rather than changing data from here.
 */
export function DuplicateNamesModal({
  open,
  onClose,
  classId,
  label,
  version,
  canManageBoys,
  canWrite,
  toast,
  openEdit,
  setViewing,
  remove,
}) {
  const [threshold, setThreshold] = useState(80)
  const [scope, setScope] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [done, setDone] = useState([])

  // Inside one class there is no "another class" to compare against, so the
  // scope filter only appears when the whole directory is in view.
  const inOneClass = Boolean(classId)
  const effectiveScope = inOneClass ? 'all' : scope

  const { data, loading, error, refetch } = useQuery(
    () =>
      BoyAPI.duplicates({
        threshold,
        scope: effectiveScope,
        class_id: classId || undefined,
      }),
    [open, threshold, effectiveScope, classId, version],
    { enabled: open },
  )

  const groups = (data?.groups || []).filter((g) => !done.includes(g.key))

  // The card rows carry the few fields needed to recognise a boy; the edit
  // screen needs his whole record.
  const withFullBoy = async (member, action) => {
    try {
      setBusyId(member.id)
      action(await BoyAPI.get(member.id))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="أسماء الأولاد المتكررة"
      sub={
        loading
          ? 'بيقارن كل الأسماء...'
          : data &&
            `${data.checked} اسم فى ${label} · ${groups.length} مجموعة محتاجة مراجعة`
      }
      headExtra={
        <div className="row" style={{ gap: 8 }}>
          <label className="xsmall muted" htmlFor="dup-threshold">
            نسبة التشابه
          </label>
          <Select
            id="dup-threshold"
            value={String(threshold)}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: 90 }}
          >
            {THRESHOLDS.map((t) => (
              <option key={t} value={t}>
                {t}%
              </option>
            ))}
          </Select>
        </div>
      }
      footer={
        <div className="dup__foot">
          <span className="xsmall muted">
            دوس على اسم الولد يفتحلك ملفه تعدّي منه الحضور والافتقاد، وبعدين امسح المكرر.
            {done.length > 0 && ` تمت معالجة ${done.length}.`}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      }
    >
      {!inOneClass && (
        <Tabs value={scope} onChange={setScope} options={SCOPES} />
      )}

      <div className="dup__body">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : loading ? (
          <Loading label="بيقارن الأسماء..." />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="check"
            title="مفيش تكرار"
            message={
              done.length
                ? 'كل اللي ظهر اتعالج.'
                : `مفيش أسماء متشابهة فوق ${threshold}% ${inOneClass ? `في ${label}` : 'بين كل الفصول'}.`
            }
          />
        ) : (
          groups.map((g) => {
            const note = groupNote(g)
            return (
              <article className="dup" key={g.key}>
                <header className="dup__head">
                  <span className="dup__score">{g.score}%</span>
                  <div className="dup__why">
                    <div className="small bold">
                      {g.exact ? 'نفس الاسم بالظبط' : WHY[g.via] || 'أسماء متشابهة'}
                    </div>
                    <div className="xsmall muted">
                      {g.same_class ? 'في فصل واحد' : 'نفس الاسم في فصلين'}
                      {note && ` · ${note}`}
                    </div>
                  </div>
                  <Badge kind={g.exact ? 'red' : 'gold'}>
                    {g.members.length} سجلات
                  </Badge>
                  {canManageBoys && (
                    <LinkButton onClick={() => setDone((d) => [...d, g.key])}>
                      تمت المعالجة
                    </LinkButton>
                  )}
                </header>

                <ul className="dup__rows">
                  {g.members.map((m) => (
                    <li className="dup__row" key={m.id}>
                      <div className="dup__who">
                        <button
                          type="button"
                          className="dup__name"
                          title="فتح الملف — تعديل الحضور ومسح الافتقاد"
                          disabled={busyId === m.id}
                          onClick={() => withFullBoy(m, setViewing)}
                        >
                          {m.boy_name}
                        </button>
                        <span className="xsmall muted">
                          {m.class_name || '—'} · {m.age !== null ? `${m.age} سنة` : 'السن مش مسجل'}
                        </span>
                      </div>
                      <div className="dup__meta">
                        {m.phone ? (
                          <a className="ltr" href={`tel:${m.phone}`}>
                            {m.phone}
                          </a>
                        ) : (
                          <span className="xsmall muted">من غير تليفون</span>
                        )}
                        <span className="xsmall muted">
                          {m.birth_date ? formatDate(m.birth_date, { withDay: false }) : '—'}
                        </span>
                        {m.teacher_name && (
                          <span className="xsmall muted">{m.teacher_name}</span>
                        )}
                      </div>
                      <div className="table__actions">
                        <IconButton
                          icon={<Icon name="eye" size={16} />}
                          label="عرض الملف"
                          disabled={busyId === m.id}
                          onClick={() => withFullBoy(m, setViewing)}
                        />
                        {canManageBoys && (
                          <IconButton
                            icon={<Icon name="edit" size={16} />}
                            label="تعديل"
                            disabled={busyId === m.id}
                            onClick={() => withFullBoy(m, openEdit)}
                          />
                        )}
                        {canWrite && (
                          <IconButton
                            icon={<Icon name="trash" size={16} />}
                            label="حذف"
                            danger
                            disabled={busyId === m.id}
                            onClick={() => remove({ id: m.id, boy_name: m.boy_name })}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })
        )}
      </div>
    </Modal>
  )
}
