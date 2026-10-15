import { Icon } from '../../components/ui/Icon'
import { waLink } from '../../lib/format'

/**
 * AuthSupport — the "stuck? talk to us" escape hatch on the sign in / sign up
 * pages. Opens a WhatsApp chat with support, prefilled with a short message.
 */
const SUPPORT_PHONE = '01281875199'
const SUPPORT_NAME = 'أ. كيرلس'
const SUPPORT_MESSAGE = 'لو واجهت أي مشكلة في التطبيق، محتاج مساعدة.'

export function AuthSupport() {
  const href = `${waLink(SUPPORT_PHONE)}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`

  return (
    <a
      className="login__support"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <Icon name="whatsapp" size={18} />
      <span>
        لو واجهتك أي مشكلة كلّم {SUPPORT_NAME}
        <b dir="ltr">{SUPPORT_PHONE}</b>
      </span>
    </a>
  )
}
