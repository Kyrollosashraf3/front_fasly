import { Progress } from '../../../components/ui/Avatar'

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
