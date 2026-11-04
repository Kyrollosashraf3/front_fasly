import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useToast } from '../../context/ToastContext'
import { useDebounced, useQuery } from '../../hooks'
import { NotificationAPI, TeacherAPI } from '../../lib/endpoints'
import { classesForStage } from '../../lib/stages'
import { Field, Input, SearchInput, Select, Textarea } from '../../components/ui/Field'
import { StageSelect } from '../../components/ui/StageSelect'
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
 * The church-wide amin writes one message for every servant, for one class, or
 * for named servants inside a class; a stage amin sends class by class inside
 * his own group; a class amin only ever reaches his own. The server pins that
 * whatever this screen sends, so a wrong audience here cannot reach another
 * class.
 *
 * Every recipient also gets a copy in his own bell in the header, so a servant
 * who never switched web push on still reads the message in the app.
 *
 * The counts are the reason this page asks before it sends: a notification only
 * lands on a phone that switched it on, so an amin sees how many servants he is
 * actually reaching - and who still has nothing.
 */
export default function NotificationsPage() {
  usePageTitle('إرسال إشعار')
  const { classes, isSuperAdmin, canPickClass, classLabel } = useAuth()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [classId, setClassId] = useState('')
  // The stage filter narrows the audience menu to the classes of one stage.
  // A send always names one concrete class, so picking a stage selects its
  // first class instead of leaving "everyone" selected by mistake.
  const [stage, setStage] = useState('')
  const visibleClasses = useMemo(() => classesForStage(classes, stage), [classes, stage])
  const pickStage = (next) => {
    setStage(next)
    if (next) {
      const narrowed = classesForStage(classes, next)
      setClassId(narrowed.length ? String(narrowed[0].id) : '')
    }
  }
  const [picked, setPicked] = useState([])
  const [search, setSearch] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  const audience = canPickClass ? (classId ? Number(classId) : null) : null
  const teacherIds = picked.length ? picked : null
  const debouncedSearch = useDebounced(search, 200)

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

  /** The servants this send may name - the same audience the server pins to. */
  const { data: servants } = useQuery(() => TeacherAPI.list({ class_id: audience }), [audience])

  // A servant of the class that just left is no longer a valid name.
  useEffect(() => {
    setPicked([])
  }, [audience])

  // A stage amin's message is logged against one class, so his picker never sits
  // on "every class" — it opens on the first class he answers for.
  useEffect(() => {
    if (!isSuperAdmin && classes.length > 1 && !classId) setClassId(String(classes[0].id))
  }, [isSuperAdmin, classes, classId])

  const visibleServants = useMemo(() => {
    const list = Array.isArray(servants) ? servants : []
    const needle = debouncedSearch.trim()
    if (!needle) return list
    return list.filter((t) => t.teacher_name?.includes(needle))
  }, [servants, debouncedSearch])

  const myClassName = classes.length === 1 ? classes[0].name : null
  /** Whomever the send covers when no names are picked. */
  const scopeName = audience ? classLabel(audience) : isSuperAdmin ? 'الشغل' : myClassName || 'فصلك'
  const canSend = title.trim().length >= 3 && body.trim().length > 0 && !sending
  const notSubscribed = status ? Math.max(0, status.staff - status.devices) : 0
  const pickedNames = useMemo(
    () => new Map((Array.isArray(servants) ? servants : []).map((t) => [t.id, t.teacher_name])),
    [servants],
  )

  const toggleServant = (id) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    )

  const send = async () => {
    setSending(true)
    try {
      const sent = await NotificationAPI.send({
        title: title.trim(),
        body: body.trim(),
        class_id: audience,
        teacher_ids: teacherIds,
        link: link || null,
      })
      toast.success(
        sent.devices
          ? `الرسالة اتبعت لـ ${sent.devices} تليفون، و اتسجلت لـ ${sent.recipients} خادم.`
          : `الرسالة اتسجلت في إشعارات ${sent.recipients} خادم، لكن مفيش تليفون مفعّل يستلمها.`,
      )
      setTitle('')
      setBody('')
      setPicked([])
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
              ? 'رسالة توصل تليفونات الخدام وجرس الإشعارات جوه التطبيق.'
              : `توصل خدام ${
                  canPickClass
                    ? `فصولك (${classes.length})`
                    : `فصلك${myClassName ? ` - ${myClassName}` : ''}`
                } على التليفون وفي الإشعارات.`}
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
              الإشعارات على التليفون مقفولة من السيرفر (مفيش مفاتيح VAPID). الرسايل هتفضل توصل
              جرس الإشعارات جوه التطبيق، وصاحب السيرفر يشغّل التليفونات عشان توصل برضه.
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
            {canPickClass ? (
              <Field label="مين يستلم">
                <div className="stage-filters">
                  <Select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="select--plain"
                    aria-label="اختيار الفصل"
                    searchable
                    searchPlaceholder="ابحث باسم الفصل..."
                  >
                    {isSuperAdmin && !stage && <option value="">كل الخدام</option>}
                    {visibleClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  {isSuperAdmin && <StageSelect value={stage} onChange={pickStage} />}
                </div>
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

          <Field
            label="خدام مختارين (اختياري)"
            hint={
              picked.length
                ? `${picked.length} خادم يستلم لوحده - غير كده كل خدام ${scopeName}`
                : `سيبه فاضي عشان يوصل كل خدام ${scopeName}، أو اختار أسماء بعينها.`
            }
          >
            <div className="push-pick">
              <SearchInput value={search} onChange={setSearch} placeholder="ابحث باسم الخادم..." />
              {picked.length > 0 && (
                <div className="push-pick__chosen">
                  {picked.map((id) => (
                    <button
                      type="button"
                      key={id}
                      className="chip chip--on"
                      aria-pressed="true"
                      onClick={() => toggleServant(id)}
                    >
                      {pickedNames.get(id) || `خادم ${id}`} ×
                    </button>
                  ))}
                </div>
              )}
              <div className="push-pick__list">
                {!servants ? (
                  <span className="small muted">جارٍ التحميل...</span>
                ) : !visibleServants.length ? (
                  <span className="small muted">مفيش خادم بالاسم ده.</span>
                ) : (
                  visibleServants.map((t) => (
                    <label
                      key={t.id}
                      className={`push-pick__row${picked.includes(t.id) ? ' is-on' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={picked.includes(t.id)}
                        onChange={() => toggleServant(t.id)}
                      />
                      <span>{t.teacher_name}</span>
                      {t.class_id != null && !audience && (
                        <span className="small muted">{classLabel(t.class_id)}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </Field>

          <div className="push-send__foot">
            {status && (
              <span className="small muted">
                {picked.length
                  ? `${picked.length} خادم مختار`
                  : status.devices
                    ? `${status.devices} تليفون من ${status.staff} خادم`
                    : `مفيش تليفون مفعّل من ${status.staff} خادم`}
                {!picked.length && notSubscribed > 0 && status.devices > 0 && (
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
                    row.audience === 'all'
                      ? 'كل الخدام'
                      : row.audience === 'servants'
                        ? `خدام مختارين${row.class_id ? ` - ${classLabel(row.class_id)}` : ''}`
                        : classLabel(row.class_id),
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
