import { ContactActions } from '../../../components/ui/ContactActions'
import { Select } from '../../../components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '../../../components/ui/States'
import { formatDate } from '../../../lib/format'
import { AbsentNowBadge, DashSection } from '../parts'

/** Servants marked absent on a chosen day (today or the last Friday). */
export function AbsentServantsList({
  servants,
  date,
  mode,
  onModeChange,
  hasSession,
  loading,
  error,
  onRetry,
  classLabel,
  singleClass,
}) {
  return (
    <DashSection
      title="سجل الغياب"
      hint={`الخدام اللي اتسجل غيابهم في ${formatDate(date)} — كلّمهم واطمن عليهم.`}
      control={
        <Select
          value={mode}
          onChange={(e) => onModeChange(e.target.value)}
          style={{ width: 160 }}
          aria-label="يوم الغياب"
        >
          <option value="last_friday">آخر جمعة</option>
          <option value="today">تاريخ اليوم</option>
        </Select>
      }
    >
      {loading ? (
        <SkeletonRows rows={3} cols={2} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : servants.length === 0 ? (
        <EmptyState
          inline
          icon={hasSession ? 'check' : 'calendar'}
          title={hasSession ? 'مفيش غياب' : 'لا توجد متابعة'}
          message={
            hasSession
              ? 'كل الخدام حضروا في اليوم المختار.'
              : 'لسه مفيش متابعة خدام مسجلة في اليوم المختار.'
          }
        />
      ) : (
        <div className="name-list">
          {servants.map((s) => (
            <div className="name-list__item" key={s.teacher_id}>
              <span className="name-list__main">
                <strong>{s.teacher_name}</strong>
                {!singleClass && (
                  <span className="muted small">• {classLabel(s.class_id)}</span>
                )}
                <ContactActions phone={s.phone} phone2={s.phone_2} />
              </span>
              <AbsentNowBadge />
            </div>
          ))}
        </div>
      )}
    </DashSection>
  )
}
