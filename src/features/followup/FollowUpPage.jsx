import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useClassScope } from '../../hooks'
import { Icon } from '../../components/ui/Icon'
import { ToolbarSearch } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { formatDate } from '../../lib/format'
import { BoyProfileModal } from '../boys/BoyProfile'
import { FollowUpToolbar } from './FollowUpToolbar'
import { FollowUpHistory } from './FollowUpHistory'
import { FollowUpList } from './FollowUpList'
import { FollowUpLogModal } from './FollowUpLogModal'
import { useFollowUpSheet } from './useFollowUpSheet'
import './followup.css'

/**
 * FollowUpPage — the weekly follow-up sheet + its history.
 *
 * Each boy is one compact line: his name, his phones, the log already recorded
 * today and two actions — «تفاصيل» opens his full file (attendance + follow-up
 * history), «تسجيل افتقاد» opens the quick log card. A manager may credit any
 * servant; a servant always logs himself.
 */
export default function FollowUpPage() {
  const { classLabel, can, user, isBoy, isServant } = useAuth()
  const scope = useClassScope()
  const { multi, classes, setPicked, firstClassId, isGlobal } = scope
  // A follow-up sheet always needs one class: fall back to the first until picked.
  const classId = scope.classId || firstClassId

  const [detailsBoy, setDetailsBoy] = useState(null)
  const [logBoy, setLogBoy] = useState(null)
  const [logEdit, setLogEdit] = useState(false)

  const label = classId ? classLabel(classId) : ''
  usePageTitle(isGlobal ? 'الافتقاد' : `الافتقاد — ${label}`)

  const canWrite = can.writeFollowUp(user)
  const canDelete = can.writeDirectory(user)
  const canPickMentor = can.writeDirectory(user)
  const myTeacherId = user?.teacher_id ?? null

  const sheet = useFollowUpSheet({
    classId,
    setPicked,
    canWrite,
    isBoy,
    myTeacherId,
    canPickMentor,
  })
  const { date, counts, roster, rows, loading, error, refetch, nameOfTeacher, followedByBoy, countByBoy } = sheet

  const openLog = (boy, { edit = false } = {}) => {
    setLogBoy(boy)
    setLogEdit(edit)
  }

  const logExisting = logEdit && logBoy ? followedByBoy.get(logBoy.id) : null

  const saveLog = async (boy, values) => {
    const ok = await sheet.saveFollowUp(boy, values, { editId: logExisting?.id })
    if (ok && values.action_date && values.action_date !== date) {
      sheet.changeDate(values.action_date)
    }
    return ok
  }

  // No class resolved yet (classes still loading) — keep the skeleton up.
  const busy = loading || !classId

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الرئيسية</a>
            <span aria-hidden="true">/</span>
            {isGlobal ? (
              <span>الافتقاد</span>
            ) : (
              <>
                <a href={`#/class/${classId}`}>{label}</a>
                <span aria-hidden="true">/</span>
                <span>الافتقاد</span>
              </>
            )}
          </nav>
          <div className="page-head__sub">
            {formatDate(date)} · {counts.done} من {counts.total} اتعلّموا
          </div>
        </div>
        <Link className="btn btn-secondary" to={`/class/${classId}/attendance`}>
          <Icon name="calendar" size={15} />
          الحضور
        </Link>
      </div>

      <FollowUpToolbar sheet={sheet} multi={multi} classes={classes} scopeClassId={scope.classId} />
      <ToolbarSearch value={sheet.search} onChange={sheet.setSearch} placeholder="ابحث بالاسم..." />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {busy ? (
          <SkeletonRows rows={7} cols={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="heart"
            title={roster.length === 0 ? (isServant ? 'مفيش أولاد في الفصل' : 'مفيش أولاد في المجموعة') : 'لا توجد نتائج'}
            message={
              roster.length === 0
                ? isServant
                  ? 'اتأكد إن فيه أولاد متسجلين في الفصل الأول.'
                  : 'وزّع الأولاد على الخادم من صفحة المجموعات أولًا.'
                : 'جرّب بحثًا مختلفًا أو غيّر الفلتر.'
            }
            action={
              roster.length === 0 && can.writeGroups(user) ? (
                <a className="btn btn-primary" href="#/groups">
                  المجموعات
                </a>
              ) : null
            }
          />
        ) : (
          <FollowUpList
            rows={rows}
            classId={classId}
            canWrite={canWrite}
            followedByBoy={followedByBoy}
            countByBoy={countByBoy}
            nameOfTeacher={nameOfTeacher}
            onDetails={setDetailsBoy}
            onLog={openLog}
            refetch={refetch}
          />
        )}
      </div>

      {!isBoy && (
        <FollowUpHistory sheet={sheet} classId={classId} canDelete={canDelete} />
      )}

      <FollowUpLogModal
        open={Boolean(logBoy)}
        boy={logBoy}
        defaultDate={date}
        defaultTeacher={logBoy ? sheet.mentorFor(logBoy.id) : ''}
        teachers={sheet.data?.teachers || []}
        canPickMentor={canPickMentor}
        existing={logExisting}
        loggedCount={logBoy ? countByBoy.get(logBoy.id) || 0 : 0}
        saving={sheet.saving}
        onSave={saveLog}
        onClose={() => {
          setLogBoy(null)
          setLogEdit(false)
        }}
      />

      <BoyProfileModal
        open={Boolean(detailsBoy)}
        boy={detailsBoy}
        onClose={() => setDetailsBoy(null)}
      />
    </>
  )
}
