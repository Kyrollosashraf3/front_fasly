import { Icon } from '../../components/ui/Icon'

/** Small red flag shown next to a boy's name when `issue_flag` is on. */
export function FlagDot({ show }) {
  return show ? <span className="flag-dot" title="محتاج متابعة" /> : null
}

/** "✎" indicator + a note preview. */
export function NoteCell({ note }) {
  if (!note) return <span className="muted xsmall">—</span>
  return (
    <span className="row" style={{ gap: 5 }} title={note}>
      <Icon name="note" size={14} className="note-indicator" />
      <span className="small truncate" style={{ maxWidth: 150 }}>
        {note}
      </span>
    </span>
  )
}
