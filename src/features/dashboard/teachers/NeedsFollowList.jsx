import { ContactActions } from '../../../components/ui/ContactActions'
import { DashSection } from '../parts'

/** Ticks a servant can miss; «حضور» is the precondition for being listed. */
const MISSING = [
  ['prepare', 'تحضير'],
  ['liturgy', 'قداس'],
  ['follow', 'افتقاد'],
  ['teachers_meeting', 'اجتماع خدام'],
]

/**
 * Servants who showed up but scored 1–3 out of 5 in the period, with the
 * ticks they missed beside each name and a direct call / WhatsApp link.
 */
export function NeedsFollowList({ servants, classLabel }) {
  if (!servants.length) return null

  return (
    <DashSection
      title="الخدام يحتاجون افتقاد"
      hint="الخدام اللي حضروا ونقاطهم أكبر من 0 وأقل من 4 خلال الفترة — وجنب كل اسم اللي ماعملوش."
    >
      <div className="name-list">
        {servants.map((s, i) => {
          const missing = MISSING.filter(([key]) => !s[key]).map(([, label]) => label)
          return (
            <div className="name-list__item" key={s.teacher_id}>
              <span className="name-list__main">
                <span className={`dash-rank dash-rank--${Math.min(i + 1, 3)}`}>{i + 1}</span>
                <strong>{s.teacher_name}</strong>
                {missing.length > 0 && (
                  <span className="small" style={{ color: 'var(--danger-ink)' }}>
                    بدون ({missing.join(' - ')})
                  </span>
                )}
                <span className="muted small">• {classLabel(s.class_id)}</span>
                <ContactActions phone={s.phone} phone2={s.phone_2} />
              </span>
              <span className="score-pill">{Number(s.score ?? 0)} نقطة</span>
            </div>
          )
        })}
      </div>
    </DashSection>
  )
}
