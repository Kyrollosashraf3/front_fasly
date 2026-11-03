import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { NotificationAPI } from '../../lib/endpoints'
import { enablePush, needsHomeScreen, pushSupported, syncPush } from '../../lib/push'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import './notifications.css'

/** The banner is only an ask, and an ask is noise after it was refused once. */
const DISMISS_KEY = 'fasly_push_banner_off'

const dismissed = () => localStorage.getItem(DISMISS_KEY) === '1'

/**
 * PushBanner — «فعّل الإشعارات».
 *
 * A notification can only reach a phone the browser registered, so the app has
 * to ask for that once. It asks the people the reminders are written for (a
 * servant and a class amin), while the server still has its VAPID keys and this
 * browser has no subscription saved yet.
 */
export default function PushBanner() {
  const { isServant, isManager, isSuperAdmin } = useAuth()
  const toast = useToast()

  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  /** The audience of every message: a servant, or the amin of a class. */
  const maySee = isServant || (isManager && !isSuperAdmin)

  const refresh = useCallback(async () => {
    try {
      const status = await NotificationAPI.status()
      setState(status)
    } catch {
      setState(null)
    }
  }, [])

  useEffect(() => {
    if (!maySee || dismissed() || !pushSupported()) return
    refresh()
  }, [maySee, refresh])

  if (!maySee || !state || state.subscribed || !state.enabled || dismissed()) return null

  const activate = async () => {
    setBusy(true)
    try {
      // A subscription the browser already holds only needs re-registering.
      if (!(await syncPush())) await enablePush()
      toast.success('تم تفعيل الإشعارات. هتوصلك تنبيهات فصلك على التليفون.')
      setState(null)
    } catch (err) {
      toast.error(err?.message || 'مش قادر يفعّل الإشعارات دلوقتي.')
    } finally {
      setBusy(false)
    }
  }

  const hide = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setState(null)
  }

  return (
    <div className="push-banner" role="status">
      <span className="push-banner__icon">
        <Icon name="bell" size={18} />
      </span>

      <div className="push-banner__text">
        <div className="push-banner__title">فعّل الإشعارات على تليفونك</div>
        <div className="push-banner__note">
          {needsHomeScreen()
            ? 'على الآيفون: ضيف «فصلي» للشاشة الرئيسية الأول من قائمة شارك، وبعدها ارجع وفعّل الإشعارات.'
            : 'تنبيهات فصلك - الافتقاد، أعياد الميلاد، والتحضير - توصلك والتطبيق مقفول.'}
        </div>
      </div>

      <Button variant="primary" size="sm" onClick={activate} loading={busy} disabled={needsHomeScreen()}>
        تفعيل
      </Button>
      <IconButton icon="✕" label="إخفاء" onClick={hide} />
    </div>
  )
}
