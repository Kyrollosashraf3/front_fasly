import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { DashboardAPI } from '../../lib/endpoints'
import { Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer, Tabs } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { ContactActions } from '../../components/ui/ContactActions'
import { formatDate, formatPercent } from '../../lib/format'
import './birthdays.css'

const KIND_OPTIONS = [
  { value: 'boys', label: 'الأولاد' },
  { value: 'teachers', label: 'الخدام' },
]

const WINDOW_OPTIONS = [
  { value: 'twoweeks', label: 'خلال أسبوعين' },
  { value: 'month', label: 'هذا الشهر' },
]

const MONTH_OPTIONS = [
  { value: '1', label: 'يناير' },
  { value: '2', label: 'فبراير' },
  { value: '3', label: 'مارس' },
  { value: '4', label: 'أبريل' },
  { value: '5', label: 'مايو' },
  { value: '6', label: 'يونيو' },
  { value: '7', label: 'يوليو' },
  { value: '8', label: 'أغسطس' },
  { value: '9', label: 'سبتمبر' },
  { value: '10', label: 'أكتوبر' },
  { value: '11', label: 'نوفمبر' },
  { value: '12', label: 'ديسمبر' },
]

const monthLabel = (value) => MONTH_OPTIONS.find((m) => m.value === value)?.label

/** "النهاردة" / "بعد 3 أيام" / "فات يومين". */
function countdown(days) {
  if (days === 0) return { kind: 'green', label: 'النهاردة 🎉' }
  if (days > 0) return { kind: 'gold', label: `بعد ${days} يوم` }
  return { kind: 'neutral', label: `فات ${Math.abs(days)} يوم` }
}

/**
 * BirthdaysPage — "أعياد الميلاد".
 *
 * A manager filters servants or boys; a servant only ever sees boys (the
 * backend enforces it too). Every row carries the birthday, the contact
 * buttons, the attendance / mass percentages and the responsible servant.
 */
export default function BirthdaysPage() {
  usePageTitle('أعياد الميلاد')
  const { user, classes, can, isServant } = useAuth()

  const [kind, setKind] = useState('boys')
  const [window, setWindow] = useState('twoweeks')
  const [month, setMonth] = useState('')
  const [classId, setClassId] = useState('')

  const kindOptions = isServant ? [KIND_OPTIONS[0]] : KIND_OPTIONS
  const showAll = can.manageClasses(user) && classes.length > 1

  const { data, loading, error, refetch } = useQuery(
    () =>
      DashboardAPI.birthdays({
        kind,
        // A chosen month replaces the quick window on the server.
        ...(month ? { month } : { window }),
        ...(classId ? { class_id: classId } : {}),
      }),
    [kind, window, month, classId],
  )

  const d = data
  const items = d?.items || []

  const scopeLabel = month ? `شهر ${monthLabel(month)}` : window === 'month' ? 'هذا الشهر' : 'خلال أسبوعين'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head__sub">
            {d ? `${d.count} مناسبة · ${scopeLabel}` : 'مواليد قريبين'}
          </div>
        </div>
      </div>

      <Toolbar>
        <Tabs value={kind} onChange={setKind} options={kindOptions} />
        <Tabs
          value={month ? '' : window}
          onChange={(value) => {
            setMonth('')
            setWindow(value)
          }}
          options={WINDOW_OPTIONS}
        />
        <Select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="select--plain"
          style={{ minWidth: 150 }}
          aria-label="اختيار الشهر"
        >
          <option value="">كل الشهور</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.value} - {m.label}
            </option>
          ))}
        </Select>
        <ToolbarSpacer />
        {classes.length > 1 && (
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="select--plain"
            style={{ minWidth: 170 }}
            aria-label="اختيار الفصل"
            searchable
            searchPlaceholder="ابحث باسم الفصل..."
          >
            {showAll && <option value="">كل الفصول</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Toolbar>

      {loading && !d ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <SkeletonRows rows={5} cols={3} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="gift"
          title="مفيش أعياد ميلاد"
          message={
            month
              ? `مفيش مواليد في شهر ${monthLabel(month)}.`
              : window === 'month'
                ? 'مفيش مواليد الشهر ده.'
                : 'مفيش مواليد خلال الفترة دي. جرّب «هذا الشهر» أو اختار شهر.'
          }
          inline
        />
      ) : (
        <div className="bday-list">
          {items.map((it) => {
            const cd = countdown(it.days_until)
            return (
              <article className="bday-card" key={`${it.kind}-${it.id}`}>
                <Avatar name={it.name} size="md" gold={it.kind === 'teacher'} />

                <div className="bday-card__main">
                  <div className="bday-card__name">
                    <span className="truncate">{it.name}</span>
                    {it.kind === 'teacher' && <Badge kind="blue">خادم</Badge>}
                    {it.class_name && <span className="muted small">• {it.class_name}</span>}
                  </div>

                  <div className="bday-card__meta">
                    <span className="bday-card__date">
                      <Icon name="gift" size={15} />
                      {formatDate(it.next_birthday, { withDay: false })}
                    </span>
                    {it.age != null && (
                      <span className="muted small">يكمّل {it.age + 1} سنة</span>
                    )}
                    {it.servant_name && (
                      <span className="muted small">الخادم: {it.servant_name}</span>
                    )}
                  </div>

                  <div className="bday-card__stats">
                    <Badge kind="navy">حضور {formatPercent(it.attendance_percent)}</Badge>
                    <Badge kind="gold">قداس {formatPercent(it.liturgy_percent)}</Badge>
                    <Badge kind={cd.kind}>{cd.label}</Badge>
                  </div>
                </div>

                <ContactActions phone={it.phone} phone2={it.phone_2} className="bday-card__actions" />
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
