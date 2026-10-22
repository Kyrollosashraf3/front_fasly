import { SearchInput } from '../../../components/ui/Field'
import { Table } from '../../../components/ui/Table'
import { DashSection } from '../../dashboard/parts'
import { servantColumns } from './columns'

/** Coverage bar chart + the servants table. */
export function ServantsSection({ data, servantRows, servantSearch, setServantSearch }) {
  if (!data.servants.length) return null

  // Rotated names need vertical room: size the canvas to the longest one.
  const longestName = data.servants.reduce(
    (max, s) => Math.max(max, (s.teacher_name || '').length),
    0,
  )
  const labelGap = 26
  const labelSpan = Math.min(180, longestName * 5.4 + 12)
  const W = 640
  const base = 170
  const H = base + labelGap + labelSpan + 14

  return (
    <DashSection
      title="أداء الخدام"
      hint="تغطية المجموعة = عدد أولاد مجموعة الخادم الذين تم افتقادهم ÷ حجم مجموعته، وبجانبها عدد الافتقادات التي سجّلها بنفسه."
    >
      <>
        <div className="card" style={{ marginBottom: 'var(--sp-3)' }}>
          <svg
            className="chart chart--servants"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="تغطية الخدام"
          >
            <line x1="36" y1={base} x2="624" y2={base} className="chart-base" />
            <line x1="36" y1="26" x2="36" y2={base} className="chart-base" />
            {[0, 25, 50, 75, 100].map((v) => {
              const y = base - (v / 100) * 130
              return (
                <g key={v}>
                  <line x1="36" y1={y} x2="624" y2={y} className="chart-grid" />
                  <text x="30" y={y + 4} className="chart-ylabel">
                    {v}%
                  </text>
                </g>
              )
            })}
            {data.servants.map((s, i) => {
              const percent = Number(s.percent || 0)
              const w = Math.max(20, (560 / Math.max(1, data.servants.length)) * 0.6)
              const x = 36 + (i + 0.5) * (560 / Math.max(1, data.servants.length))
              const h = (percent / 100) * 130
              const y = base - h
              return (
                <g key={s.teacher_id}>
                  <rect x={x - w / 2} y={y} width={w} height={h} rx="4" className="chart-bar" />
                  <text
                    x={x}
                    y={base + labelGap}
                    transform={`rotate(-90 ${x} ${base + labelGap})`}
                    textAnchor="end"
                    className="chart-xlabel"
                    style={{ fontSize: '9px' }}
                  >
                    {s.teacher_name}
                  </text>
                  <text x={x} y={y - 4} className="chart-val">
                    {percent}%
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
          <SearchInput value={servantSearch} onChange={setServantSearch} placeholder="ابحث باسم الخادم..." />
        </div>
        <Table
          columns={servantColumns(data)}
          rows={servantRows}
          rowKey={(s) => s.teacher_id}
          sortable
          stackOnMobile
          compact
        />
      </>
    </DashSection>
  )
}
