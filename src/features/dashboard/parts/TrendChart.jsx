import { formatShort } from '../../../lib/format'
import { shortDate } from './fields'

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
