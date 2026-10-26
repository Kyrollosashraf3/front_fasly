/**
 * PerformanceCurve — pure-SVG curve of one servant metric.
 *
 * The x-axis is the selected servants in the order the caller sorted them
 * (best → worst, or the reverse), the y-axis is the chosen metric. A point per
 * servant and a tooltip with the full name answer "who is best at what" while
 * the shape of the curve shows how steep the gap between them is.
 */
export function PerformanceCurve({
  items = [],
  metricKey = 'score',
  metricLabel = 'النقاط',
}) {
  if (!items.length) return null

  const values = items.map((s) => Number(s[metricKey] ?? 0))
  // Round the top up to a multiple of 4 so the four grid lines stay integers.
  const yMax = Math.max(4, Math.ceil(Math.max(1, ...values) / 4) * 4)

  const W = 760
  const H = 300
  const P = { top: 24, right: 44, bottom: 78, left: 110 }
  const iw = W - P.left - P.right
  const ih = H - P.top - P.bottom
  const base = P.top + ih

  const x = (i) =>
    items.length === 1 ? P.left + iw / 2 : P.left + (iw * i) / (items.length - 1)
  const y = (v) => base - (v / yMax) * ih

  const linePath = values
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${x(items.length - 1).toFixed(1)},${base.toFixed(1)} L${x(0).toFixed(1)},${base.toFixed(1)} Z`

  const ticks = [0, 1, 2, 3, 4].map((g) => (yMax * g) / 4)
  const showValues = items.length <= 10
  const shortName = (name) =>
    name && String(name).length > 16 ? `${String(name).slice(0, 15)}…` : name

  return (
    <svg
      className="chart chart--servants"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`منحنى ${metricLabel}`}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={P.left} y1={y(v)} x2={W - P.right} y2={y(v)} className="chart-grid" />
          <text x={P.left - 6} y={y(v) + 4} className="chart-ylabel">
            {Math.round(v)}
          </text>
        </g>
      ))}
      <line x1={P.left} y1={base} x2={W - P.right} y2={base} className="chart-base" />
      <path d={areaPath} className="chart-area" />
      <path d={linePath} className="chart-line" />
      {items.map((s, i) => (
        <g key={s.teacher_id}>
          <circle cx={x(i)} cy={y(values[i])} r="5" className="chart-dot">
            <title>
              {`${s.teacher_name} — ${metricLabel}: ${values[i]}${s.score !== undefined ? ` • النقاط ${s.score}` : ''}`}
            </title>
          </circle>
          {showValues && (
            <text x={x(i)} y={y(values[i]) - 10} className="chart-val">
              {values[i]}
            </text>
          )}
          <text
            x={x(i)}
            y={H - 14}
            className="chart-xlabel chart-xlabel--name"
            transform={`rotate(-30 ${x(i)} ${H - 14})`}
          >
            {shortName(s.teacher_name)}
          </text>
        </g>
      ))}
    </svg>
  )
}
