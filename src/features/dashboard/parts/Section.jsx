import { SectionTitle } from '../../../components/ui/Bits'

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
