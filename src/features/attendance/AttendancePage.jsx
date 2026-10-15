import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { useClassScope, useDebounced, useQuery } from '../../hooks'
import { AttendAPI, BoyAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { Input, SearchInput } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { BoyForm } from '../boys/BoyForm'
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

/**
 * AttMark — a labelled tick chip for one attendance fact.
 *
 * A bare checkbox gave no clue which box was «حضور» and which was «قداس», so
 * each fact now carries its own name. `type` picks the colour: green for the
 * Sunday-school attendance, gold for the mass.
 */
function AttMark({ type, checked, onToggle, disabled }) {
  const conf =
    type === 'liturgy'
      ? { label: 'قداس', hint: 'حضر القداس' }
      : { label: 'حضور', hint: 'حضر مدارس الأحد' }

  return (
    <button
      type="button"
      className={`att-mark att-mark--${type}${checked ? ' is-on' : ''}`}
      aria-pressed={checked}
      aria-label={`${conf.hint}: ${checked ? 'نعم' : 'لا'}`}
      disabled={disabled}
      onClick={() => onToggle(!checked)}
    >
      <span className="att-mark__box">{checked && <Icon name="check" size={14} />}</span>
      <span className="att-mark__label">{conf.label}</span>
    </button>
  )
}

export default function AttendancePage() {
  const { classLabel, can, user, isBoy } = useAuth()
  const scope = useClassScope()
  const { multi, classes, setPicked, firstClassId, isGlobal } = scope
  // A sheet always needs one class: fall back to the first until one is picked.
  const classId = scope.classId || firstClassId
  const toast = useToast()
  const modal = useModal()

  const label = classId ? classLabel(classId) : ''
  usePageTitle(isGlobal ? 'الحضور' : `الحضور — ${label}`)

  const canWrite = can.writeAttendance(user) && !isBoy
  // Adding a boy is a directory write, not an attendance write — servants take
  // the sheet but only a manager may grow the class.
  const canAdd = can.writeDirectory(user) && !isBoy

  const [date, setDate] = useState(lastFridayISO())
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('all')
  const [view, setView] = useState('all')
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

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
    { enabled: Boolean(classId) },
  )

  /**
   * The whole Friday history of the class, once, regardless of the date being
   * edited — all it needs from it is "was he there the Friday before?".
   */
  const { data: history } = useQuery(
    () => AttendAPI.list({ class_id: classId }),
    [classId],
    { enabled: Boolean(classId) },
  )

  // Seed the working copy whenever the source data changes.
  useEffect(() => {
    if (!data) return
    const next = {}
    for (const a of data.attends || []) {
      next[a.boy_id] = { present: a.present, liturgy: a.liturgy ?? false, note: a.note || '' }
    }
    setMarks(next)
  }, [data])

  const getMark = (boyId) =>
    marks[boyId] || { present: false, liturgy: false, note: '' }

  const setMark = (boyId, patch) =>
    setMarks((m) => ({ ...m, [boyId]: { ...getMark(boyId), ...patch } }))

  /** Server state vs local state �?" drives the "unsaved" pill. */
  const dirty = useMemo(() => {
    if (!data) return false
    const server = new Map((data.attends || []).map((a) => [a.boy_id, a]))
    for (const boy of data.boys || []) {
      const local = marks[boy.id]
      // No row on the server yet == the default (absent, no note).
      const remote = server.get(boy.id) ?? { present: false, liturgy: false, note: '' }
      const present = local?.present ?? false
      const liturgy = local?.liturgy ?? false
      const note = local?.note ?? ''
      if (remote.present !== present || (remote.liturgy ?? false) !== liturgy || (remote.note || '') !== note) return true
    }
    return false
  }, [data, marks])

  const rows = useMemo(() => {
    const q = normalizeSearch(debounced)
    return (data?.boys || []).filter((b) => {
      if (gender !== 'all' && b.gender !== gender) return false
      if (q && !normalizeSearch(b.boy_name).includes(q) && !normalizeSearch(b.phone).includes(q)) return false
      if (view === 'present' && !getMark(b.id).present) return false
      // smart "absent" view: a boy only drops off the list once BOTH facts are
      // in — marked present AND marked mass. Ticking one of them keeps him here.
      if (view === 'absent' && getMark(b.id).present && getMark(b.id).liturgy) return false
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
      for (const b of data?.boys || []) {
        const cur = getMark(b.id)
        // storm "كل الغائبين": wiping present also wipes mass (mass implies present)
        next[b.id] = value
          ? { ...cur, present: true }
          : { ...cur, present: false, liturgy: false }
      }
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
          liturgy: Boolean(getMark(b.id).liturgy),
          note: getMark(b.id).note || null,
        })),
      })
      toast.success(`تم حفظ حضور ${formatDate(date)}.`)
      await refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Warn before leaving with a Friday sheet that still has unsaved ticks.
  useUnsavedGuard(canWrite && dirty, save, `فيه تعديلات حضور لسه متحفظتش ليوم ${formatDate(date)}.`)

  /** Switching the date reloads the sheet — confirm first when it is dirty. */
  const changeDate = async (next) => {
    if (next === date) return
    if (canWrite && dirty) {
      const ok = await modal.confirm({
        title: 'تغيير التاريخ؟',
        message: 'فيه تعديلات حضور لسه متحفظتش. لو غيّرت التاريخ هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setDate(next)
  }

  /** Switching the class (global mode) reloads the sheet — confirm first. */
  const changeClass = async (next) => {
    if (!next || next === classId) return
    if (canWrite && dirty) {
      const ok = await modal.confirm({
        title: 'تغيير الفصل؟',
        message: 'فيه تعديلات حضور لسه متحفظتش. لو غيّرت الفصل هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setPicked(next)
  }

  /** boyId -> the row already stored on the server for this sheet, if any. */
  const savedRecords = useMemo(
    () => new Map((data?.attends || []).map((a) => [a.boy_id, a])),
    [data],
  )
  const savedOf = (boyId) => savedRecords.get(boyId)

  const columns = [
    {
      key: 'boy_name',
      label: 'الاسم',
      // A capped name column keeps the tick chips right beside the name on a
      // desktop sheet instead of stranded in the middle of a wide table.
      width: 280,
      // no label on the phone card — the name speaks for itself
      mobile: '',
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
    ...(canWrite
      ? [
          {
            key: 'marks',
            label: '',
            align: 'start',
            mobile: '',
            render: (b) => (
              <div className="att-marks">
                <AttMark
                  type="present"
                  checked={getMark(b.id).present}
                  // un-ticking presence also un-ticks the mass (mass implies presence)
                  onToggle={(v) =>
                    setMark(b.id, v ? { present: true } : { present: false, liturgy: false })
                  }
                />
                <AttMark
                  type="liturgy"
                  checked={Boolean(getMark(b.id).liturgy)}
                  // ticking the mass ticks presence too — you can't attend mass and be absent
                  onToggle={(v) =>
                    setMark(b.id, v ? { liturgy: true, present: true } : { liturgy: false })
                  }
                />
              </div>
            ),
          },
        ]
      : []),
  ]

  // `!classId` covers the moment before the super admin's classes arrive.
  const busy = loading || !classId
  const noRecords = !busy && (data?.boys || []).length === 0

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

      <Toolbar className="att-toolbar">
        {multi && (
          <ClassFilter value={classId} onChange={changeClass} classes={classes} ariaLabel="اختيار فصل الحضور" />
        )}
        <label className="row small bold" style={{ gap: 8 }}>
          <Icon name="calendar" size={16} />
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => changeDate(e.target.value)}
            style={{ width: 160 }}
          />
        </label>

        <SearchInput className="att-search-inline" value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

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

      {/* on the phone the toolbar scrolls away, so the search gets its own
          sticky bar that stays reachable while the list scrolls */}
      <div className="att-search-sticky">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />
      </div>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {busy ? (
          <SkeletonRows rows={8} cols={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : noRecords ? (
          <EmptyState
            icon="boys"
            title="لا يوجد أولاد في الفصل"
            message="ضيف الأولاد الأول عشان تقدر تسجّل الحضور."
            action={
              canAdd ? (
                <div className="row" style={{ gap: 10 }}>
                  <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={() => setAddOpen(true)}>
                    إضافة ولد
                  </Button>
                  <a className="btn btn-secondary" href={`#/class/${classId}/boys`}>
                    بيانات الأولاد
                  </a>
                </div>
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
            {canAdd && (
              <Button
                variant="secondary"
                icon={<Icon name="plus" size={16} />}
                onClick={() => setAddOpen(true)}
              >
                إضافة ولد
              </Button>
            )}
            <Button variant="accent" loading={saving} disabled={!dirty} onClick={save} icon={<Icon name="check" size={16} />}>
              حفظ الحضور
            </Button>
          </div>
        </div>
      )}

      <BoyForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultClassId={classId}
        onSaved={refetch}
      />
    </>
  )
}
