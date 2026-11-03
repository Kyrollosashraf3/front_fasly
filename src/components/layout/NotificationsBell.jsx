import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDismiss, useQuery } from '../../hooks'
import { NotificationAPI } from '../../lib/endpoints'
import { formatDateTime } from '../../lib/format'
import { Icon } from '../ui/Icon'

/** Re-read the bell this often, so a message written on the server shows up
 *  even in a tab that never received the push (or has push switched off). */
const POLL_MS = 60000

/** The kind labels the send screen uses, kept short for the bell. */
const KIND_LABELS = {
  manual: 'رسالة',
  followup: 'افتقاد',
  birthday: 'عيد ميلاد',
  wednesday: 'الأربعاء',
}

/**
 * NotificationsBell — the header bell.
 *
 * The server writes one row per recipient when a message is sent, so a servant
 * sees his messages here whether or not his phone ever answered a push. The
 * count refreshes on a minute; a push that lands in this browser nudges it
 * immediately (see `sw.js`).
 */
export function NotificationsBell() {
  const { isBoy } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useDismiss(ref, () => setOpen(false), open)

  const { data: unread, refetch: refetchCount } = useQuery(
    () => NotificationAPI.unread(),
    [],
    { enabled: !isBoy },
  )

  const { data: rows, loading, setData, refetch: refetchRows } = useQuery(
    () => NotificationAPI.inbox({ limit: 30 }),
    [open],
    { enabled: !isBoy && open },
  )

  const refresh = useCallback(() => {
    refetchCount()
    if (open) refetchRows()
  }, [open, refetchCount, refetchRows])

  useEffect(() => {
    if (isBoy) return undefined
    const timer = setInterval(refresh, POLL_MS)
    /* The service worker shows the system notification; it posts here so the
       bell counts it without waiting for the next minute. Coming back to the
       tab asks too, because messages may have arrived while it was hidden. */
    const onMessage = (event) => event.data?.type === 'push:received' && refresh()
    window.addEventListener('message', onMessage)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('message', onMessage)
      window.removeEventListener('focus', refresh)
    }
  }, [isBoy, refresh])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (isBoy) return null

  const count = unread?.count || 0

  const openRow = async (row) => {
    setOpen(false)
    if (!row.read_at) {
      setData((all) => all?.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)))
      // A failed tick does not hide a message already on the screen, so the
      // count is re-read afterwards rather than trusted from here.
      await NotificationAPI.markRead(row.id).catch(() => {})
      refetchCount()
    }
    if (row.link) navigate(row.link.replace(/^#/, ''))
  }

  const readAll = async () => {
    setData((all) => all?.map((r) => ({ ...r, read_at: r.read_at || new Date().toISOString() })))
    await NotificationAPI.markAllRead().catch(() => {})
    refetchCount()
  }

  return (
    <span className="notif-bell" ref={ref}>
      <button
        type="button"
        className={`notif-bell__btn${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={count ? `الإشعارات — ${count} جديد` : 'الإشعارات'}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" size={18} />
        {count > 0 && <span className="notif-bell__count">{count > 9 ? '٩+' : count}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel" role="menu">
          <div className="notif-bell__head">
            <span className="notif-bell__title">الإشعارات</span>
            {count > 0 && (
              <button type="button" className="notif-bell__all" onClick={readAll}>
                اقرأ الكل
              </button>
            )}
          </div>

          {loading && !rows ? (
            <div className="notif-bell__empty small muted">جارٍ التحميل...</div>
          ) : !rows?.length ? (
            <div className="notif-bell__empty">
              <Icon name="bell" size={20} />
              <span>مفيش إشعارات دلوقتي.</span>
            </div>
          ) : (
            <ul className="notif-bell__list">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`notif-bell__item${row.read_at ? '' : ' is-unread'}`}
                    onClick={() => openRow(row)}
                  >
                    <span className="notif-bell__kind">{KIND_LABELS[row.kind] || row.kind}</span>
                    <span className="notif-bell__text">
                      <span className="notif-bell__row-title">{row.title}</span>
                      <span className="notif-bell__body">{row.body}</span>
                      <span className="notif-bell__time">{formatDateTime(row.created_at)}</span>
                    </span>
                    {!row.read_at && <span className="notif-bell__mark" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  )
}
