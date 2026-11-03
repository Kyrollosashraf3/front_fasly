import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useToast } from '../../context/ToastContext'
import { useQuery } from '../../hooks'
import { NotificationAPI } from '../../lib/endpoints'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { formatDateTime } from '../../lib/format'
import './notifications.css'

const TITLE_MAX = 120
const BODY_MAX = 400

/** What the log calls each sender: a hand-written message or the clock. */
const KIND_LABELS = {
  manual: { label: 'إرسال يدوي', kind: 'navy' },
  followup: { label: 'تذكير الافتقاد', kind: 'blue' },
  birthday: { label: 'عيد ميلاد', kind: 'gold' },
  wednesday: { label: 'تحضير الأربعاء', kind: 'green' },
}

/** The page a tap opens. ``class_id`` is never needed: each login lands on his own. */
const LINK_OPTIONS = [
  { value: '', label: 'الرئيسية' },
  { value: '#/followup', label: 'صفحة الافتقاد' },
  { value: '#/attendance', label: 'كشف الحضور' },
  { value: '#/birthdays', label: 'أعياد الميلاد' },
  { value: '#/groups', label: 'المجموعات' },
  { value: '#/checks', label: 'متابعة الخدام' },
]

/**
 * NotificationsPage — «إرسال إشعار».
 *
 * The general amin writes one message for every servant or for one class; a
 * class amin only ever reaches his own, and the server pins that whatever this
 * screen sends, so a wrong audience here cannot reach another class.
 *
 * The counts are the reason this page asks before it sends: a notification only
 * lands on a phone that switched it on, so an amin sees how many servants he is
 * actually reaching - and who still has nothing.
 */
export default function NotificationsPage() {
  usePageTitle('إرسال إشعار')
  const { classes, isSuperAdmin, classLabel } = useAuth()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [classId, setClassId] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  const audience = isSuperAdmin ? (classId ? Number(classId) : null) : null

  const {
    data: status,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery(() => NotificationAPI.status({ class_id: audience }), [audience])

  const { data: log, loading: logLoading, error: logError, refetch: refetchLog } = useQuery(
    () => NotificationAPI.log({ limit: 30 }),
    [],
  )

  const myClassName = classes.length === 1 ? classes[0].name : null
  const canSend = title.trim().length >= 3 && body.trim().length > 0 && !sending
  const notSubscribed = status ? Math.max(0, status.staff - status.devices) : 0

  const send = async () => {
    setSending(true)
    try {
      const sent = await NotificationAPI.send({
        title: title.trim(),
        body: body.trim(),
        class_id: audience,
        link: link || null,
      })
      toast.success(
        sent.devices
          ? `الرسالة اتبعت لـ ${sent.devices} تليفون.`
          : 'الرسالة اتسجلت، لكن مفيش تليفون مفعّل يستلمها.',
      )
      setTitle('')
      setBody('')
      refetchLog()
      refetchStatus()
    } catch (err) {
      toast.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head__sub">
            {isSuperAdmin
              ? 'رسالة توصل تليفونات الخدام والتطبيق مقفول.'
              : `توصل خدام فصلك${myClassName ? ` - ${myClassName}` : ''}.`}
          </div>
        </div>
      </div>

      {statusLoading && !status ? (
        <SkeletonRows rows={2} cols={2} />
      ) : statusError ? (
        <ErrorState error={statusError} onRetry={refetchStatus} />
      ) : (
        status?.enabled === false && (
          <div className="push-off">
            <Icon name="alert" size={16} />
            <span>
              الإشعارات مقفولة من السيرفر (مفيش مفاتيح VAPID). صاحب السيرفر يشغّلها عشان الرسايل توصل.
            </span>
          </div>
        )
      )}

      <div className="push-send">
        <section className="push-card">
          <Field label="العنوان" required hint={`${title.length}/${TITLE_MAX}`}>
            <Input
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: اجتماع الخدام بكرة ٧ مساءً"
            />
          </Field>

          <Field label="الرسالة" required hint={`${body.length}/${BODY_MAX}`}>
            <Textarea
              rows={4}
              value={body}
              maxLength={BODY_MAX}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب الرسالة اللي هتظهر على التليفون."
            />
          </Field>

          <div className="push-send__row">
            {isSuperAdmin ? (
              <Field label="مين يستلم">
                <Select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="select--plain"
                  aria-label="اختيار الفصل"
                  searchable
                  searchPlaceholder="ابحث باسم الفصل..."
                >
                  <option value="">كل الخدام</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="مين يستلم">
                <div className="push-audience">
                  <Icon name="servant" size={15} />
                  <span>خدام فصلك{myClassName ? `: ${myClassName}` : ''}</span>
                </div>
              </Field>
            )}

            <Field label="صفحة يفتحها الضغط">
              <Select
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="select--plain"
                aria-label="اختيار الصفحة"
              >
                {LINK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="push-send__foot">
            {status && (
              <span className="small muted">
                {status.devices
                  ? `${status.devices} تليفون من ${status.staff} خادم`
                  : `مفيش تليفون مفعّل من ${status.staff} خادم`}
                {notSubscribed > 0 && status.devices > 0 && (
                  <> · {notSubscribed} لسه مفعلش الإشعارات</>
                )}
              </span>
            )}
            <Button variant="primary" onClick={send} loading={sending} disabled={!canSend} block>
              إرسال
            </Button>
          </div>
        </section>

        <section className="push-history">
          <div className="section-title">
            <span>آخر الرسايل</span>
            {logLoading && !log ? (
              <span className="small muted">جارٍ التحميل...</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={refetchLog}>
                تحديث
              </Button>
            )}
          </div>

          {logError ? (
            <ErrorState error={logError} onRetry={refetchLog} />
          ) : logLoading && !log ? (
            <SkeletonRows rows={3} cols={3} />
          ) : !log?.length ? (
            <EmptyState
              icon="bell"
              title="مفيش رسايل لحد دلوقتي"
              message="أول رسالة بتظهر هنا، والرسايل اللي بتيجي من التذكيرات اليومية كمان."
              inline
            />
          ) : (
            <Table
              compact
              stackOnMobile
              sortable={false}
              rows={log}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: 'kind',
                  label: 'النوع',
                  mobile: 'النوع',
                  width: 130,
                  render: (row) => {
                    const meta = KIND_LABELS[row.kind] || { label: row.kind, kind: 'neutral' }
                    return <Badge kind={meta.kind}>{meta.label}</Badge>
                  },
                },
                {
                  key: 'title',
                  label: 'الرسالة',
                  mobile: 'الرسالة',
                  render: (row) => (
                    <div className="push-history__text">
                      <div className="push-history__title">{row.title}</div>
                      <div className="small muted truncate">{row.body}</div>
                    </div>
                  ),
                },
                {
                  key: 'audience',
                  label: 'لمين',
                  mobile: 'لمين',
                  width: 130,
                  render: (row) =>
                    row.audience === 'all' ? 'كل الخدام' : classLabel(row.class_id),
                },
                {
                  key: 'sent',
                  label: 'وصل',
                  mobile: 'وصل',
                  align: 'center',
                  width: 90,
                  render: (row) =>
                    row.failed ? (
                      <Badge kind="red">{`${row.sent} / ${row.failed}`}</Badge>
                    ) : (
                      <Badge kind="green">{row.sent}</Badge>
                    ),
                },
                {
                  key: 'created_at',
                  label: 'وقت الإرسال',
                  mobile: 'وقت الإرسال',
                  width: 150,
                  render: (row) => <span className="small muted">{formatDateTime(row.created_at)}</span>,
                },
              ]}
            />
          )}
        </section>
      </div>
    </>
  )
}
