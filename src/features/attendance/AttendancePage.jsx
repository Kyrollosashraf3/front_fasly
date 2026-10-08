import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { AttendAPI, BoyAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Input, SearchInput } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { AttendEditMarker } from './AttendEditDialog'
import { formatDate, lastFridayISO, todayISO } from '../../lib/format'
import './attendance.css'

/**
 * AttendancePage — the Friday sheet, kept deliberately bare: a name, the box to
 * tick, and a small red flag when the boy missed the previous Friday. The full
 * history, the percentage and the boy's file live in the follow-up sheet.
 *
 * Local `marks` holds the working copy (boyId -> {present, note}); the save
 * bar only appears when something actually changed, and everything is written
 * in ONE POST /attendance/bulk (the API upserts per boy+date).
 */
export default function AttendancePage() {
  const { classId } = useParams()
  const { classLabel, can, user, isBoy } = useAuth()
  const toast = useToast()

  const label = classLabel(classId)
  usePageTitle(`الحضور — ${label}`)

  const canWrite = can.writeAttendance(user) && !isBoy

  const [date, setDate] = useState(lastFridayISO())
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('all')
  const [view, setView] = useState('all')
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [boys, attends] = await Promise.all([
        BoyAPI.list({ class_id: classId }),
        AttendAPI.list({ class_id: classId, action_date: date }),
      ])
      return { boys, attends }
    },
    [classId, date],
  )

  /**
   * The whole Friday history of the class, once, regardless of the date being
   * edited — all it needs from it is "was he there the Friday before?".
   */
  const { data: history } = useQuery(() => AttendAPI.list({ class_id: classId }), [classId])

  // Seed the working copy whenever the source data changes.
  useEffect(() => {
    if (!data) return
    const next = {}
    for (const a of data.attends || []) {
      next[a.boy_id] = { present: a.present, note: a.note || '' }
    }
    setMarks(next)
  }, [data])

  const getMark = (boyId) =>
    marks[boyId] || { present: false, note: '' }

  const setMark = (boyId, patch) =>
    setMarks((m) => ({ ...m, [boyId]: { ...getMark(boyId), ...patch } }))

  /** Server state vs local state — drives the "unsaved" pill. */
  const dirty = useMemo(() => {
    if (!data) return false
    const server = new Map((data.attends || []).map((a) => [a.boy_id, a]))
    for (const boy of data.boys || []) {
      const local = marks[boy.id]
      // No row on the server yet == the default (absent, no note).
      const remote = server.get(boy.id) ?? { present: false, note: '' }
      const present = local?.present ?? false
      const note = local?.note ?? ''
      if (remote.present !== present || (remote.note || '') !== note) return true
    }
    return false
  }, [data, marks])

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return (data?.boys || []).filter((b) => {
      if (gender !== 'all' && b.gender !== gender) return false
      if (q && !b.boy_name.toLowerCase().includes(q) && !(b.phone || '').includes(q)) return false
      if (view === 'present' && !getMark(b.id).present) return false
      if (view === 'absent' && getMark(b.id).present) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, debounced, gender, view, marks])

  const counts = useMemo(() => {
    const boys = data?.boys || []
    let present = 0
    for (const b of boys) if (getMark(b.id).present) present += 1
    return { present, absent: boys.length - present, total: boys.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, marks])

  const allDone = counts.total > 0 && counts.present + counts.absent === counts.total && counts.present === counts.total

  /**
   * boyId -> the most recent Friday recorded *before* this sheet, used for the
   * small "غاب الجمعة اللي فاتت" flag. A missing row means nothing was recorded.
   */
  const previousAbsent = useMemo(() => {
    const map = new Map()
    for (const row of history || []) {
      if (String(row.date) >= date) continue
      if (row.present) continue
      const seen = map.get(row.boy_id)
      if (!seen || String(row.date) > String(seen)) map.set(row.boy_id, row.date)
    }
    return map
  }, [history, date])

  const setAll = (value) => {
    setMarks((m) => {
      const next = { ...m }
      for (const b of data?.boys || []) next[b.id] = { ...getMark(b.id), present: value }
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await AttendAPI.saveBulk({
        date,
        items: (data?.boys || []).map((b) => ({
          boy_id: b.id,
          present: Boolean(getMark(b.id).present),
          note: getMark(b.id).note || null,
        })),
      })
      toast.success(`تم حفظ حضور ${formatDate(date)}.`)
      await refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  /** boyId -> the row already stored on the server for this sheet, if any. */
  const savedRecords = useMemo(
    () => new Map((data?.attends || []).map((a) => [a.boy_id, a])),
    [data],
  )
  const savedOf = (boyId) => savedRecords.get(boyId)

  const columns = [
    ...(canWrite
      ? [
          {
            key: 'present',
            label: 'حاضر',
            width: 78,
            align: 'center',
            mobile: '',
            render: (b) => (
              <input
                type="checkbox"
                className="att-check"
                aria-label={`حاضر: ${b.boy_name}`}
                checked={getMark(b.id).present}
                onChange={(e) => setMark(b.id, { present: e.target.checked })}
              />
            ),
          },
        ]
      : []),
    {
      key: 'boy_name',
      label: 'الاسم',
      mobile: 'الاسم',
      render: (b) => (
        <span className="table__name">
          <BoyName
            boy={b}
            classId={classId}
            onSaved={refetch}
            suffix={b.gender === 'f' ? <span className="xsmall muted">(بنت)</span> : null}
          />
          {previousAbsent.has(b.id) && (
            <span className="att-hint att-hint--absent" title="غاب الجمعة اللي فاتت">
              غاب الجمعة اللي فاتت
            </span>
          )}
          {canWrite && savedOf(b.id) && (
            <AttendEditMarker boy={b} record={savedOf(b.id)} date={date} onSaved={refetch} />
          )}
        </span>
      ),
    },
  ]

  const noRecords = !loading && (data?.boys || []).length === 0

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الفصول</a>
            <span aria-hidden="true">/</span>
            <a href={`#/class/${classId}`}>{label}</a>
            <span aria-hidden="true">/</span>
            <span>الحضور</span>
          </nav>
          <h1 className="page-head__title">تسجيل الحضور</h1>
          <div className="page-head__sub">{formatDate(date)}</div>
        </div>
        <Link className="btn btn-secondary" to={`/class/${classId}`}>
          <Icon name="chevronStart" size={15} />
          رجوع للفصل
        </Link>
      </div>

      <Toolbar>
        <label className="row small bold" style={{ gap: 8 }}>
          <Icon name="calendar" size={16} />
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 160 }}
          />
        </label>

        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

        <Tabs
          value={gender}
          onChange={setGender}
          options={[
            { value: 'all', label: 'الكل' },
            { value: 'm', label: 'أولاد' },
            { value: 'f', label: 'بنات' },
          ]}
        />

        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: 'الكل', count: counts.total },
            { value: 'present', label: 'الحاضرون', count: counts.present },
            { value: 'absent', label: 'الغائبون', count: counts.absent },
          ]}
        />

        <ToolbarSpacer />

        {canWrite && (
          <div className="toolbar__group">
            <Button variant="ghost" size="sm" onClick={() => setAll(true)}>
              الكل حاضر
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
              الكل غائب
            </Button>
          </div>
        )}
      </Toolbar>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {loading ? (
          <SkeletonRows rows={8} cols={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : noRecords ? (
          <EmptyState
            icon="boys"
            title="لا يوجد أولاد في الفصل"
            message="ضيف الأولاد الأول عشان تقدر تسجّل الحضور."
            action={
              can.writeDirectory(user) ? (
                <a className="btn btn-primary" href={`#/class/${classId}/boys`}>
                  بيانات الأولاد
                </a>
              ) : null
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد نتائج"
            message="جرّب بحثًا مختلفًا أو غيّر الفلتر."
            inline
          />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(b) => b.id}
            rowClassName={(b) => (getMark(b.id).present ? 'is-present' : '')}
            stackOnMobile
          />
        )}
      </div>

      {canWrite && counts.total > 0 && (
        <div className="att-savebar">
          <div className="summary-bar__stats">
            <span className="summary-bar__stat">
              حاضر <span className="summary-bar__num">{counts.present}</span>
            </span>
            <span className="summary-bar__stat">
              غائب <span className="summary-bar__num">{counts.absent}</span>
            </span>
            <span className="summary-bar__stat small" style={{ opacity: 0.8 }}>
              من {counts.total}
            </span>
            {allDone && <span className="badge badge--gold">خلصت — الكل اتعلّم</span>}
          </div>

          <div className="row" style={{ gap: 10 }}>
            {dirty && <Badge kind="gold" dot>فيه تعديلات لمتحفظش</Badge>}
            <Button variant="accent" loading={saving} disabled={!dirty} onClick={save} icon={<Icon name="check" size={16} />}>
              حفظ الحضور
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
