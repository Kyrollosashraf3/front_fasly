import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useQuery } from '../../hooks'
import { Button, IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ContactActions } from '../../components/ui/ContactActions'
import { DetailRow, ScorePill } from '../../components/ui/Bits'
import { ErrorState, Loading } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { AttendAPI, DashboardAPI, FollowUpAPI } from '../../lib/endpoints'
import { calcAge, formatDate, shortLink } from '../../lib/format'
import { BoyNameEdit } from './BoyName'
import './boy-profile.css'

/** Read-only key/value block — reused by the list, groups and dashboards. */
export function BoyDetails({ boy, classLabel, showServant = true }) {
  return (
    <div className="details">
      <DetailRow label="الاسم">{boy.boy_name}</DetailRow>
      <DetailRow label="النوع">{boy.gender === 'f' ? 'بنت' : 'ولد'}</DetailRow>
      <DetailRow label="السن">
        {calcAge(boy.birth_date) !== null
          ? `${calcAge(boy.birth_date)} سنة`
          : boy.birth_date
            ? formatDate(boy.birth_date, { withDay: false })
            : '—'}
      </DetailRow>
      <DetailRow label="الفصل">{classLabel ? classLabel(boy.class_id) : boy.class_id}</DetailRow>
      {/* The assignment is the amin's; showing it to a servant only invites
          him to wonder why his edit changed it. */}
      {showServant && <DetailRow label="الخادم">{boy.teacher_name || '—'}</DetailRow>}
      <DetailRow label="التليفون">
        {boy.phone ? (
          <a className="row ltr" style={{ gap: 6, justifyContent: 'flex-end' }} href={`tel:${boy.phone}`}>
            <Icon name="phone" size={14} />
            {boy.phone}
          </a>
        ) : (
          '—'
        )}
      </DetailRow>
      {boy.phone_2 && <DetailRow label="تليفون تاني">{boy.phone_2}</DetailRow>}
      <DetailRow label="المنطقة">{boy.zone}</DetailRow>
      <DetailRow label="العنوان">{boy.address}</DetailRow>
      {boy.location && (
        <DetailRow label="الخريطة">
          <a
            className="row ltr"
            style={{ gap: 6, justifyContent: 'flex-end', color: 'var(--gold-hover)' }}
            href={boy.location}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="pin" size={14} />
            {shortLink(boy.location)}
          </a>
        </DetailRow>
      )}
      <DetailRow label="ملاحظات">{boy.note || '—'}</DetailRow>
      <DetailRow label="حالة">
        {boy.issue_flag ? (
          <Badge kind="red" dot>
            محتاج متابعة
          </Badge>
        ) : (
          <Badge kind="green" dot>
            طبيعي
          </Badge>
        )}
      </DetailRow>
    </div>
  )
}

/**
 * Season attendance strip — green/red squares, one per Friday.
 *
 * `onPick` makes a square a correction, not just a report: «حاضر» with no row
 * behind it takes one, and the row of a Friday he actually missed goes away.
 * A Friday that was never taken (`present === null`) is not offered, because
 * writing him onto it would mark the whole class session as taken.
 */
function SeasonGrid({ fridays = [], editable = false, busyDate = null, onPick }) {
  if (!fridays.length) return <p className="small muted">لسه مفيش حضور مسجّل.</p>

  return (
    <div className="friday-grid">
      {fridays.map((f) => {
        const pending = f.present === null || f.present === undefined
        const state = pending ? 'is-pending' : f.present ? 'is-present' : 'is-absent'
        const label = pending ? 'لسه ماتاخدش' : f.present ? 'حاضر' : 'غائب'
        const hint = !editable || pending
          ? ''
          : f.id
            ? '\nدوس عليه علشان تشيل حضوره'
            : '\nدوس عليه علشان تسجله حاضر'
        const title = `${formatDate(f.date)} — ${label}${f.note ? `\n${f.note}` : ''}${hint}`
        const cells = (
          <>
            <span className="friday-cell__date">
              {formatDate(f.date, { withDay: false }).split(' ')[0]}
            </span>
            <span className="friday-cell__mark">{pending ? '—' : f.present ? '✓' : '✕'}</span>
          </>
        )

        if (!editable) {
          return (
            <div key={f.date} className={`friday-cell ${state}`} title={title}>
              {cells}
            </div>
          )
        }

        return (
          <button
            key={f.date}
            type="button"
            className={`friday-cell ${state} ${pending ? '' : 'is-pickable'}`}
            disabled={pending || busyDate !== null}
            title={title}
            onClick={() => onPick(f)}
          >
            {cells}
          </button>
        )
      })}
    </div>
  )
}

/**
 * BoyProfileModal — the full drill-down (details + season + follow-ups).
 * Used from Boys, Groups and both dashboards so it exists exactly once.
 * Loads GET /dashboard/boys/{id} for the history.
 */
export function BoyProfileModal({ open, boy, onClose, nameOfTeacher, onChanged }) {
  const { classLabel, isBoy, isServant, can, user } = useAuth()
  const toast = useToast()
  const modal = useModal()
  const [busyDate, setBusyDate] = useState(null)

  const { data, loading, error, refetch } = useQuery(
    () => DashboardAPI.boyProfile(boy.id),
    [boy?.id],
    { enabled: open && Boolean(boy) },
  )

  if (!boy) return null

  const profile = data
  const pct = profile?.percent ?? null
  const canMarkAttendance = !isBoy && can.writeAttendance(user)
  // The backend only lets an amin delete a follow-up row, so the trash can
  // appears for exactly the logins that would not get a 403.
  const canRemoveFollowUp = !isBoy && can.writeDirectory(user)

  /** Re-read the card, then tell whoever opened it that the row changed. */
  const afterWrite = () => {
    refetch()
    onChanged?.()
  }

  const toggleFriday = async (f) => {
    // A saved row is the only thing a Friday can lose; a missing one is added.
    if (f.id) {
      const sure = await modal.confirm({
        title: 'تشيل حضور الجمعة؟',
        message: `${boy.boy_name} — ${formatDate(f.date)}`,
        confirmLabel: 'شيل الحضور',
      })
      if (!sure) return
    }
    setBusyDate(f.date)
    try {
      if (f.id) {
        await AttendAPI.remove(f.id)
      } else {
        await AttendAPI.saveBulk({ date: f.date, items: [{ boy_id: boy.id, present: true }] })
      }
      toast.success(f.id ? 'اتشيل الحضور.' : 'اتسجل حاضر.')
      afterWrite()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusyDate(null)
    }
  }

  const removeFollowUp = async (item) => {
    const sure = await modal.confirm({
      title: 'مسح سجل الافتقاد؟',
      message: `${formatDate(item.action_date)} — ${followLabel(item.status)}`,
    })
    if (!sure) return
    try {
      await FollowUpAPI.remove(item.id)
      toast.success('الافتقاد اتمسح.')
      afterWrite()
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={boy.boy_name}
      sub={
        profile
          ? `${profile.present} حاضر من ${profile.total} · ${pct !== null ? `${pct}%` : '—'}`
          : classLabel(boy.class_id)
      }
      headExtra={
        <div className="row" style={{ gap: 8 }}>
          {pct !== null && (
            <span className="profile-score">
              <ScorePill value={pct} />
            </span>
          )}
          <ContactActions phone={boy.phone} phone2={boy.phone_2} />
          <BoyNameEdit boy={boy} label={`تعديل بيانات ${boy.boy_name}`} />
        </div>
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      <div className="profile-body">
        {error ? (
          <ErrorState error={error} onRetry={refetch} inline />
        ) : loading ? (
          <Loading label="جارٍ تحميل السجل..." />
        ) : (
          profile && (
            <>
              <section>
                <h4 className="profile__h">
                  جمعات السنة الكنسية
                  <span className="muted xsmall" style={{ fontWeight: 400, marginInlineStart: 6 }}>
                    {profile.season?.present ?? 0} من {profile.season?.total ?? 0}
                  </span>
                </h4>
                {canMarkAttendance && (
                  <p className="xsmall muted profile__hint">
                    دوس على أي جمعة علشان تصلّح حضوره فيها.
                  </p>
                )}
                <SeasonGrid
                  fridays={profile.season?.fridays}
                  editable={canMarkAttendance}
                  busyDate={busyDate}
                  onPick={toggleFriday}
                />
              </section>

              <section>
                <h4 className="profile__h">البيانات</h4>
                <BoyDetails boy={boy} classLabel={classLabel} showServant={!isServant} />
              </section>

                            <section>
                <h4 className="profile__h">سجل الافتقاد</h4>
                {profile.followups?.length ? (
                  <ul className="profile__timeline">
                    {profile.followups.map((f, i) => (
                      <li key={i}>
                        <span className="profile__dot" />
                        <span className="bold">{formatDate(f.action_date)}</span>
                        <Badge kind="blue">{followLabel(f.status)}</Badge>
                        {nameOfTeacher && f.teacher_id && (
                          <span className="xsmall muted">{nameOfTeacher(f.teacher_id)}</span>
                        )}
                        {f.note && <span className="small muted">{f.note}</span>}
                        {canRemoveFollowUp && f.id && (
                          <IconButton
                            icon={<Icon name="trash" size={15} />}
                            label="مسح سجل الافتقاد"
                            danger
                            onClick={() => removeFollowUp(f)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small muted">
                    {isBoy ? 'مفيش افتقاد مسجّل.' : 'لسه مفيش افتقاد مسجّل.'}
                  </p>
                )}
              </section>


              {profile.notes?.length > 0 && (
                <section>
                  <h4 className="profile__h">الملاحظات</h4>
                  <ul className="profile__notes">
                    {profile.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </section>
              )}

            </>
          )
        )}
      </div>
    </Modal>
  )
}

export const followLabel = (status) =>
  ({ call: 'مكالمة', visit: 'زيارة منزل', whatsapp: 'واتساب', no_answer: 'لا يوجد رد', other: 'أخرى' })[
    status
  ] || status
