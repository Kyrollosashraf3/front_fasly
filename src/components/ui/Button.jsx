/**
 * Button — every button in the app.
 *
 *   <Button variant="primary" icon="＋" loading={saving}>حفظ</Button>
 *   <IconButton icon="✎" label="ملاحظة" onClick={...} />
 */
export function Button({
  variant = 'secondary',
  size,
  icon,
  loading = false,
  disabled = false,
  block = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    block && 'btn-block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : icon ? <span className="btn__icon">{icon}</span> : null}
      {children}
    </button>
  )
}

/** Square, icon-only action — used inside table rows and toolbars. */
export function IconButton({ icon, label, danger = false, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`btn-icon ${danger ? 'btn-icon--danger' : ''} ${className}`}
      title={label}
      aria-label={label}
      {...rest}
    >
      {icon}
    </button>
  )
}

/** Text-only action (inline in tables, next to labels). */
export function LinkButton({ variant, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`btn-link ${variant === 'danger' ? 'btn-link--danger' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
