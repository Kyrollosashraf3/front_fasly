import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useClassScope } from '../../hooks'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ToolbarSearch } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { formatDate } from '../../lib/format'
import { FLAGS } from './constants'
import { CheckToolbar } from './CheckToolbar'
import { checkColumns } from './checksColumns'
import { useTeacherCheckSheet } from './useTeacherCheckSheet'
import './checks.css'

/**
 * TeacherCheckPage — the amin's weekly review of his servants, and each
 * servant's own self check-in. Managers write every row; a servant writes only
 * his own (the API scopes his list to himself). A boy never reaches this page.
 */
export default function TeacherCheckPage() {
  const { classLabel, can, user } = useAuth()
  const scope = useClassScope()
  const { multi, classes, picked, setPicked, firstClassId, isGlobal } = scope
  // A check sheet always needs one class: fall back to the first until picked.
  const classId = scope.classId || firstClassId

  const label = classId ? classLabel(classId) : ''
  usePageTitle(isGlobal ? 'متابعة الخدام' : `متابعة الخدام — ${label}`)

  const canWrite = can.writeChecks(user)
  const sheet = useTeacherCheckSheet({ classId, setPicked, canWrite })
  const { date, search, setSearch, rows, loading, error, refetch, stats } = sheet

  const columns = checkColumns({ sheet, canWrite })

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
              <span>متابعة الخدام</span>
            ) : (
              <>
                <a href={`#/class/${classId}`}>{label}</a>
                <span aria-hidden="true">/</span>
                <span>متابعة الخدام</span>
              </>
            )}
          </nav>
          <h1 className="page-head__title">متابعة الخدام</h1>
          <div className="page-head__sub">{formatDate(date)}</div>
        </div>
        <Link className="btn btn-secondary" to={`/class/${classId}/teachers`}>
          <Icon name="chevronStart" size={15} />
          دليل الخدام
        </Link>
      </div>

      <CheckToolbar
        sheet={sheet}
        multi={multi}
        classes={classes}
        picked={picked}
        firstClassId={firstClassId}
        canWrite={canWrite}
      />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {busy ? (
          <SkeletonRows rows={6} cols={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <div className="check-sticky">
              <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث باسم الخادم..." />
              {rows.length > 0 && (
                <div className="check-mhead" aria-hidden="true">
                  <span>الخادم</span>
                  {FLAGS.map((f) => (
                    <span key={f.key} title={f.label}>
                      {f.short}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <EmptyState
                icon="servant"
                title="لا يوجد خدام"
                message="ضيف خدام الفصل الأول عشان تقدر تتابعهم."
                action={
                  can.writeDirectory(user) ? (
                    <a className="btn btn-primary" href={`#/class/${classId}/teachers`}>
                      دليل الخدام
                    </a>
                  ) : null
                }
              />
            ) : (
              <Table
                columns={columns}
                rows={rows}
                rowKey={(t) => t.id}
                stackOnMobile
                className="check-table"
              />
            )}
          </>
        )}
      </div>

      {canWrite && stats.total > 0 && (
        <>
          <div className="att-savebar">
            <div className="summary-bar__stats">
              <span className="summary-bar__stat">
                اتعلّموا <span className="summary-bar__num">{stats.done}</span>
              </span>
              <span className="summary-bar__stat small" style={{ opacity: 0.8 }}>
                من {stats.total}
              </span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              {sheet.dirty && <Badge kind="gold" dot>تعديلات غير محفوظة</Badge>}
              <Button
                variant="accent"
                loading={sheet.saving}
                disabled={!sheet.dirty}
                onClick={sheet.save}
                icon={<Icon name="check" size={16} />}
              >
                حفظ المتابعة
              </Button>
            </div>
          </div>
          <div className="att-savebar-space" aria-hidden="true" />
        </>
      )}
    </>
  )
}
