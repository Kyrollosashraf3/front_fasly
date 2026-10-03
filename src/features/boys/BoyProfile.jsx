import { useAuth } from '../../context/AuthContext'
import { useQuery } from '../../hooks'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { DetailRow, ScorePill } from '../../components/ui/Bits'
import { ErrorState, Loading } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { DashboardAPI } from '../../lib/endpoints'
import { calcAge, formatDate, shortLink } from '../../lib/format'
import './boy-profile.css'

/** Read-only key/value block — reused by the list, groups and dashboards. */
export function BoyDetails({ boy, classLabel }) {
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

/** Season attendance strip — green/red squares, one per Friday. */
function SeasonGrid({ fridays = [] }) {
  if (!fridays.length) return <p className="small muted">لسه مفيش حضور مسجّل.</p>
  return (
    <div className="friday-grid">
      {fridays.map((f) => (
        <div
          key={f.date}
          className={`friday-cell ${f.present ? 'is-present' : 'is-absent'}`}
          title={`${formatDate(f.date)} — ${f.present ? 'حاضر' : 'غائب'}${f.note ? `\n${f.note}` : ''}`}
        >
          <span className="friday-cell__date">{formatDate(f.date, { withDay: false }).split(' ')[0]}</span>
          <span className="friday-cell__mark">{f.present ? '✓' : '✕'}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * BoyProfileModal — the full drill-down (details + season + follow-ups).
 * Used from Boys, Groups and both dashboards so it exists exactly once.
 * Loads GET /dashboard/boys/{id} for the history.
 */
export function BoyProfileModal({ open, boy, onClose }) {
  const { classLabel, isBoy } = useAuth()

  const { data, loading, error, refetch } = useQuery(
    () => DashboardAPI.boyProfile(boy.id),
    [boy?.id],
    { enabled: open && Boolean(boy) },
  )

  if (!boy) return null

  const profile = data
  const pct = profile?.percent ?? null

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
        pct !== null ? (
          <span className="profile-score">
            <ScorePill value={pct} />
          </span>
        ) : null
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      <div className="profile-body">
        <section>
          <h4 className="profile__h">البيانات</h4>
          <BoyDetails boy={boy} classLabel={classLabel} />
        </section>

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
                <SeasonGrid fridays={profile.season?.fridays} />
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

              <section>
                <h4 className="profile__h">سجل الافتقاد</h4>
                {profile.followups?.length ? (
                  <ul className="profile__timeline">
                    {profile.followups.map((f, i) => (
                      <li key={i}>
                        <span className="profile__dot" />
                        <span className="bold">{formatDate(f.action_date)}</span>
                        <Badge kind="blue">{followLabel(f.status)}</Badge>
                        {f.note && <span className="small muted">{f.note}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small muted">
                    {isBoy ? 'مفيش افتقاد مسجّل.' : 'لسه مفيش افتقاد مسجّل.'}
                  </p>
                )}
              </section>
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
