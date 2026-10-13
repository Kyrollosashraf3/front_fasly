import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { BoyName } from '../boys/BoyName'

import { Progress } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/States'
import { SectionTitle } from '../../components/ui/Bits'
import { Select } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { formatShort } from '../../lib/format'

/* ------------------------------------------------------------- helpers */

export const shortDate = (iso) => {
  const p = String(iso || '').split('-')
  return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}` : String(iso || '')
}

/** "عدد الجمع: [n]" dropdown, bound to a `useN` setter. */
export function NField({ label, value, onChange, from = 1, to = 12 }) {
  const options = []
  for (let i = from; i <= to; i += 1) options.push(i)
  return (
    <label className="n-field">
      {label}
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 78 }}>
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
    </label>
  )
}

/** The period every follow-up / confession section is measured over. */
export const PERIOD_OPTIONS = [
  { value: 7, label: 'آخر أسبوع' },
  { value: 30, label: 'آخر شهر' },
  { value: 90, label: 'آخر 3 شهور' },
]

export function PeriodField({ value, onChange }) {
  return (
    <label className="n-field">
      الفترة
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 132 }}>
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  )
}

/**
 * The date window the whole dashboard is measured over:
 * last Friday (default) / the whole history / the current church year.
 * Mirrors the backend's `date_mode` query values.
 */
export const DATE_MODE_OPTIONS = [
  { value: 'last_friday', label: 'آخر جمعة' },
  { value: 'all', label: 'كل الفترة' },
  { value: 'season', label: 'من بداية السنة الكنسية' },
]

export function DateModeField({ value, onChange }) {
  return (
    <label className="n-field">
      الفترة
      <Select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 190 }}>
        {DATE_MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  )
}

/* ------------------------------------------------------------------- kpi */

export function Kpi({ hero = false, value, label, sub, progress }) {
  return (
    <div className={`dash-kpi ${hero ? 'hero' : ''}`}>
      <div className="kpi-num">{value}</div>
      <div className="kpi-label">{label}</div>
      {hero && progress !== undefined && <Progress value={progress} />}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

/** Grid of KPI cards. */
export function KpiRow({ children }) {
  return <div className="dash-kpis">{children}</div>
}

/* --------------------------------------------------------------- section */

export function DashSection({ title, hint, control, children }) {
  return (
    <div className="dash-section">
      <SectionTitle action={control}>{title}</SectionTitle>
      {hint && <p className="dash-hint">{hint}</p>}
      {children}
    </div>
  )
}

/** A card holding a chart or a list, with an inline empty state. */
export function DashCard({ empty, children }) {
  if (empty) return <div className="card">{empty}</div>
  return <div className="card">{children}</div>
}

/* ----------------------------------------------------------------- chart */

/**
 * Bar chart of per-friday counts. Pure SVG — no chart library.
 * Points are ascending (oldest → newest) exactly like the API returns them.
 * When a point carries ``liturgy`` a second, gold bar is drawn beside the navy
 * one, so boys attendance and mass attendance share one axis.
 */
export function TrendChart({ points = [], unit = 'حاضر', secondUnit = 'قداس' }) {
  if (!points.length) return null

  const hasLiturgy = points.some((p) => p.liturgy !== undefined)
  const value = (p) => Math.max(p.present || 0, hasLiturgy ? p.liturgy || 0 : 0)

  const W = 640
  const H = 250
  const P = { top: 26, right: 14, bottom: 30, left: 36 }
  const iw = W - P.left - P.right
  const ih = H - P.top - P.bottom
  const base = P.top + ih
  const max = Math.max(1, ...points.map(value))
  const slot = iw / points.length
  const groupW = Math.min(70, slot * 0.72)
  const barW = hasLiturgy ? groupW / 2 - 2 : Math.min(52, slot * 0.52)
  const y = (v) => base - (v / (max * 1.2 || 1)) * ih

  const grid = [0, 1, 2, 3, 4].map((g) => {
    const v = Math.round((max * 1.2 * g) / 4)
    const yy = y(v)
    return (
      <g key={g}>
        <line x1={P.left} y1={yy} x2={W - P.right} y2={yy} className="chart-grid" />
        <text x={P.left - 6} y={yy + 4} className="chart-ylabel">
          {v}
        </text>
      </g>
    )
  })

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="منحنى الحضور">
      {grid}
      <line x1={P.left} y1={base} x2={W - P.right} y2={base} className="chart-base" />
      {points.map((p, i) => {
        const cx = P.left + slot * i + slot / 2
        const x0 = hasLiturgy ? cx - groupW / 2 : cx - barW / 2
        const presentTop = y(p.present)
        const isMax = !hasLiturgy && p.present === max && max > 0
        const liturgy = p.liturgy || 0
        const liturgyTop = y(liturgy)
        return (
          <g key={p.date || i}>
            <rect
              x={x0.toFixed(1)}
              y={presentTop.toFixed(1)}
              width={barW.toFixed(1)}
              height={Math.max(2, base - presentTop).toFixed(1)}
              rx="7"
              className={`chart-bar ${isMax ? 'max' : ''}`}
            >
              <title>{`${formatShort(p.date)}: ${unit} ${p.present}${hasLiturgy ? ` • ${secondUnit} ${liturgy}` : ` / غائب ${p.absent}`}`}</title>
            </rect>
            {hasLiturgy && (
              <rect
                x={(x0 + barW + 2).toFixed(1)}
                y={liturgyTop.toFixed(1)}
                width={barW.toFixed(1)}
                height={Math.max(2, base - liturgyTop).toFixed(1)}
                rx="7"
                className="chart-bar chart-bar--liturgy"
              >
                <title>{`${formatShort(p.date)}: ${secondUnit} ${liturgy}`}</title>
              </rect>
            )}
            <text x={cx.toFixed(1)} y={(Math.min(presentTop, hasLiturgy ? liturgyTop : presentTop) - 7).toFixed(1)} className="chart-val">
              {p.present}
            </text>
            <text x={cx.toFixed(1)} y={H - 8} className="chart-xlabel">
              {shortDate(p.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------ name lists */

/**
 * The "class → boys" group lists used by streaks / absentees.
 * Rows carry an extra badge and a "عرض الملف" button.
 */
export function ClassGroups({
  groups = {},
  singleClass = false,
  emptyTitle,
  emptyMsg,
  badge,
  onBoy,
  actionLabel = 'عرض الملف',
}) {
  const { classLabel } = useAuth()
  const classes = Object.keys(groups).filter((c) => groups[c]?.length)
  if (!classes.length) {
    return <EmptyState icon="chart" title={emptyTitle} message={emptyMsg} inline />
  }
  const showHead = classes.length > 1 || !singleClass

  return (
    <div className="class-groups">
      {classes.map((c) => (
        <div className="class-group" key={c}>
          {showHead && <h3 className="class-group__title">{classLabel(Number(c))}</h3>}
          <div className="name-list">
            {groups[c].map((b) => (
              <div className="name-list__item" key={b.boy_id}>
                <span className="name-list__main">
                  <BoyName
                    boy={b}
                    classId={Number(c)}
                    flag={false}
                    suffix={badge ? badge(b) : null}
                  />
                </span>
                <Button variant="secondary" size="sm" onClick={() => onBoy?.(b)}>
                  {actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The "class → servants" group lists used by follow-up coverage / confessions.
 * Rows carry a name, an optional note (count / last date) and a badge.
 * Servants have no drill-down modal, so there is no action button.
 */
export function ServantGroups({
  groups = {},
  singleClass = false,
  emptyTitle,
  emptyMsg,
  badge,
}) {
  const { classLabel } = useAuth()
  const classes = Object.keys(groups).filter((c) => groups[c]?.length)
  if (!classes.length) {
    return <EmptyState icon="servant" title={emptyTitle} message={emptyMsg} inline />
  }
  const showHead = classes.length > 1 || !singleClass

  return (
    <div className="class-groups">
      {classes.map((c) => (
        <div className="class-group" key={c}>
          {showHead && <h3 className="class-group__title">{classLabel(Number(c))}</h3>}
          <div className="name-list">
            {groups[c].map((s) => (
              <div className="name-list__item" key={s.teacher_id}>
                <span className="name-list__main">
                  <strong>{s.teacher_name}</strong>
                  {s.count !== undefined && <span className="muted small">• {s.count} افتقاد</span>}
                  {s.last && <span className="muted small">• آخر {formatShort(s.last)}</span>}
                  {badge ? badge(s) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- badges */

export const StreakBadge = ({ streak }) => <span className="score-pill">{streak} جمعة</span>
export const AbsentBadge = ({ count }) => <Badge kind="red">غياب {count}</Badge>
export const AbsentNowBadge = () => <Badge kind="red">غائب</Badge>
export const LiturgyBadge = ({ percent }) => (
  <Badge kind="gold">{percent}% قداس</Badge>
)
export const FollowedBadge = ({ count }) => <Badge kind="green">اتفتقد {count}</Badge>
export const TodoBadge = () => <Badge kind="red">لم يُفتقد</Badge>
export const LateBadge = ({ days }) => (
  <Badge kind="red">{days == null ? 'مفيش اعتراف' : `متأخر ${days} يوم`}</Badge>
)

/* --------------------------------------------------- boy drill-down hook */

/** Opens the shared boy profile modal from any dashboard row. */
export function useBoyDrawer() {
  const [boy, setBoy] = useState(null)
  const open = (b) =>
    setBoy(
      typeof b === 'object'
        ? { id: b.id ?? b.boy_id, boy_name: b.boy_name, class_id: b.class_id }
        : { id: Number(b), boy_name: `ولد #${b}` },
    )
  return [boy, open, () => setBoy(null)]
}
