import { ROLE_BADGE_KIND, ROLE_LABELS } from '../../lib/roles'

const KINDS = ['neutral', 'gold', 'green', 'red', 'blue', 'navy']

export function Badge({ kind = 'neutral', dot = false, children, title }) {
  const cls = KINDS.includes(kind) ? kind : 'neutral'
  return (
    <span className={`badge badge--${cls}`} title={title}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}

/** Role badge used in the topbar, profile and the accounts table. */
export function RoleBadge({ role }) {
  return <Badge kind={ROLE_BADGE_KIND[role] || 'neutral'}>{ROLE_LABELS[role] || role}</Badge>
}
