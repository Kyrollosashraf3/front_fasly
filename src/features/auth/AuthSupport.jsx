import { Icon } from '../../components/ui/Icon'
import { waLink } from '../../lib/format'

/**
 * AuthSupport — the "stuck? talk to us" escape hatch on the sign in / sign up
 * pages. Opens a WhatsApp chat with support, prefilled with a short message.
 * The phone number is intentionally never shown.
 */
const SUPPORT_NAME = 'أ. كيرلس'
const SUPPORT_PHONE = '01281875199'
const SUPPORT_MESSAGE = 'لو واجهت أي مشكلة في التطبيق، محتاج مساعدة.'

export function AuthSupport() {
  const href = `${waLink(SUPPORT_PHONE)}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`

  return (
    <div className="login__support">
      <p className="login__support-text">
        لو واجهتك أي مشكلة كلّم {SUPPORT_NAME}
      </p>
      <a
        className="login__support-btn"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="whatsapp" size={18} />
        أضغط هنا
      </a>
    </div>
  )
}
