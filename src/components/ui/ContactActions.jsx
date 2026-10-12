import { Icon } from './Icon'
import { waLink } from '../../lib/format'

/**
 * ContactActions — one-tap call / WhatsApp links for a person's phone.
 *
 *   <ContactActions phone={row.phone} phone2={row.phone_2} />
 *
 * Renders nothing when neither number is usable, so a row never shows a dead
 * icon. Call opens the dialer (`tel:`); WhatsApp opens `wa.me` — the number is
 * lifted to international format by `waLink`.
 */
export function ContactActions({ phone, phone2, className = '' }) {
  const tel = phone || phone2
  const wa = waLink(phone) || waLink(phone2)
  if (!tel && !wa) return null

  return (
    <div className={`contact-actions ${className}`.trim()}>
      {tel && (
        <a
          className="contact-actions__btn contact-actions__btn--call"
          href={`tel:${String(tel).replace(/\s/g, '')}`}
          title="اتصال"
          aria-label="اتصال"
        >
          <Icon name="phone" size={16} />
        </a>
      )}
      {wa && (
        <a
          className="contact-actions__btn contact-actions__btn--wa"
          href={wa}
          target="_blank"
          rel="noreferrer"
          title="واتساب"
          aria-label="واتساب"
        >
          <Icon name="whatsapp" size={16} />
        </a>
      )}
    </div>
  )
}
