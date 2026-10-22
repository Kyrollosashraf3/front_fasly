import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useClassScope } from '../../hooks'
import { Icon } from '../../components/ui/Icon'
import { ToolbarSearch } from '../../components/ui/Toolbar'
import { BoyForm } from '../boys/BoyForm'
import { formatDate } from '../../lib/format'
import { AttendanceToolbar } from './AttendanceToolbar'
import { AttendanceList } from './AttendanceList'
import { AttendanceSaveBar } from './AttendanceSaveBar'
import { useAttendanceSheet } from './useAttendanceSheet'
import './attendance.css'

/**
 * AttendancePage — the Friday sheet, kept deliberately bare: a name, the box to
 * tick, and a small red flag when the boy missed the previous Friday. The full
 * history, the percentage and the boy's file live in the follow-up sheet.
 *
 * Local `marks` holds the working copy (boyId -> {present, liturgy, note}); the
 * save bar only appears when something actually changed. Only the boys who are
 * ticked present are written, in ONE POST /attendance/bulk (the API upserts per
 * boy+date) — a boy with no tick has no row at all, so his absence is the
 * default and is never stored as false.
 *
 * Once a boy is saved his chips lock: changing him is a deliberate «تعديل» on
 * that one row, saved on its own (PATCH while present, DELETE when unticked so
 * he again keeps no row), never a full-sheet rewrite.
 */
export default function AttendancePage() {
  const { classLabel, can, user, isBoy } = useAuth()
  const scope = useClassScope()
  const { multi, classes, setPicked, firstClassId, isGlobal } = scope
  // A sheet always needs one class: fall back to the first until one is picked.
  const classId = scope.classId || firstClassId

  const label = classId ? classLabel(classId) : ''
  usePageTitle(isGlobal ? 'الحضور' : `الحضور — ${label}`)

  const canWrite = can.writeAttendance(user) && !isBoy
  // Servants can grow their class right from the sheet while taking attendance.
  const canAdd = can.writeBoys(user) && !isBoy

  const sheet = useAttendanceSheet({ classId, canWrite, canAdd, setPicked })
  const { date, search, setSearch, openAddBoy } = sheet

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الرئيسية</a>
            <span aria-hidden="true">/</span>
            {isGlobal ? (
              <span>الحضور</span>
            ) : (
              <>
                <a href={`#/class/${classId}`}>{label}</a>
                <span aria-hidden="true">/</span>
                <span>الحضور</span>
              </>
            )}
          </nav>
          <h1 className="page-head__title">تسجيل الحضور</h1>
          <div className="page-head__sub">
            {formatDate(date)}{label ? ` · ${label}` : ''}
          </div>
        </div>
        <a className="btn btn-secondary" href={classId ? `#/class/${classId}/boys` : '#/boys'}>
          <Icon name="boys" size={15} />
          بيانات الأولاد
        </a>
      </div>

      <AttendanceToolbar sheet={sheet} classId={classId} multi={multi} classes={classes} />

      {/* on the phone the toolbar scrolls away, so the search gets its own
          sticky bar that stays reachable while the list scrolls */}
      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        <AttendanceList
          sheet={sheet}
          classId={classId}
          canWrite={canWrite}
          canAdd={canAdd}
          onAddBoy={openAddBoy}
        />
      </div>

      <AttendanceSaveBar sheet={sheet} canAdd={canAdd} onAddBoy={openAddBoy} />

      <BoyForm
        open={sheet.addOpen}
        onClose={() => sheet.setAddOpen(false)}
        defaultClassId={classId}
        onSaved={sheet.refetch}
      />
    </>
  )
}
