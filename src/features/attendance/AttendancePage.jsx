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
import { Button, IconButton } from '../../components/ui/Button'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { Input, SearchInput } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSearch } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { BoyForm } from '../boys/BoyForm'
import { formatDate, lastFridayISO, todayISO } from '../../lib/format'
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
  // Servants can grow their class right from the sheet while taking attendance.
  const canAdd = can.writeBoys(user) && !isBoy

  const [date, setDate] = useState(lastFridayISO())
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('all')
  const [view, setView] = useState('all')
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)
  // Boy ids whose already-saved row is unlocked for a correction.
  const [editing, setEditing] = useState(() => new Set())
  const [rowSaving, setRowSaving] = useState(null)
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

  /** The saved row of each boy for this date, keyed by boy id. */
  const serverById = useMemo(
    () => new Map((data?.attends || []).map((a) => [a.boy_id, a])),
    [data],
  )

  /** A boy with a saved «حاضر» row for this date (a legacy false row is not). */
  const isSaved = (boyId) => {
    const record = serverById.get(boyId)
    return Boolean(record && (record.present || record.liturgy))
  }

  /** A saved boy is locked (his chips disabled) until he is opened to edit. */
  const isLocked = (boyId) => isSaved(boyId) && !editing.has(boyId)

  /** Does this boy's saved row differ from the working copy? */
  const rowChanged = (boyId) => {
    const remote = serverById.get(boyId)
    if (!remote) return false
    const local = getMark(boyId)
    return (
      Boolean(remote.present) !== Boolean(local.present) ||
      Boolean(remote.liturgy) !== Boolean(local.liturgy) ||
      (remote.note || '') !== (local.note || '')
    )
  }

  /**
   * Only brand-new ticks (boys with no saved present row) drive the global
   * save — a saved boy is changed on his own row through «تعديل» instead.
   */
  const dirty = useMemo(() => {
    for (const boy of data?.boys || []) {
      if (isSaved(boy.id)) continue
      if (getMark(boy.id).present) return true
    }
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, marks, serverById])

  /** A saved boy opened for edit whose row has changed but is not saved yet. */
  const editingDirty = useMemo(() => {
    for (const id of editing) if (rowChanged(id)) return true
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, marks, serverById])

  const unsaved = dirty || editingDirty

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

  /**
   * Persist one already-saved boy: refresh his row while present, remove it
   * when he is unticked — so an absent boy keeps no row at all.
   */
  const persistRow = async (boyId) => {
    const record = serverById.get(boyId)
    if (!record) return
    const mark = getMark(boyId)
    if (mark.present) {
      await AttendAPI.update(record.id, {
        present: true,
        liturgy: Boolean(mark.liturgy),
        note: mark.note || null,
      })
    } else {
      await AttendAPI.remove(record.id)
    }
  }

  /** Save one opened boy on his own row, without touching anyone else. */
  const saveRow = async (boyId) => {
    setRowSaving(boyId)
    try {
      await persistRow(boyId)
      toast.success('تم تعديل الحضور.')
      setEditing((s) => {
        const next = new Set(s)
        next.delete(boyId)
        return next
      })
      await refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setRowSaving(null)
    }
  }

  /** Leave edit mode, throwing the row's local change away. */
  const cancelRow = (boyId) => {
    const record = serverById.get(boyId)
    if (record) {
      setMarks((m) => ({
        ...m,
        [boyId]: { present: record.present, liturgy: record.liturgy ?? false, note: record.note || '' },
      }))
    }
    setEditing((s) => {
      const next = new Set(s)
      next.delete(boyId)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      // Only the ticked (present) boys are sent. A boy with no tick simply has
      // no row in the sheet — his absence is the default and is never written
      // as false, so he is left exactly as he already was.
      const items = (data?.boys || [])
        .filter((b) => !isSaved(b.id) && getMark(b.id).present)
        .map((b) => ({
          boy_id: b.id,
          present: true,
          liturgy: Boolean(getMark(b.id).liturgy),
          note: getMark(b.id).note || null,
        }))

      // An empty sheet is valid (nobody showed up) — nothing to write, and the
      // API rejects an empty bulk, so the call is skipped.
      if (items.length) await AttendAPI.saveBulk({ date, items })

      // Any saved boy left open in edit mode is flushed alongside the new ticks.
      for (const id of editing) if (rowChanged(id)) await persistRow(id)
      setEditing(new Set())

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
  useUnsavedGuard(canWrite && unsaved, save, `فيه تعديلات حضور لسه متحفظتش ليوم ${formatDate(date)}.`)

  /**
   * Opening the quick "add boy" form reloads the sheet, which would wipe any
   * ticks not saved yet — so offer to save them first.
   */
  const openAddBoy = async () => {
    if (canWrite && unsaved) {
      const ok = await modal.confirm({
        title: 'تحفظ الحضور الأول؟',
        message: 'فيه تعديلات حضور لسه متحفظتش. الأفضل تحفظها قبل ما تضيف ولد جديد عشان متضيعش.',
        confirmLabel: 'احفظ وكمّل',
        kind: 'primary',
      })
      if (!ok) return
      const ok2 = await save()
      if (!ok2) return
    }
    setAddOpen(true)
  }

  /** Switching the date reloads the sheet — confirm first when it is dirty. */
  const changeDate = async (next) => {
    if (next === date) return
    if (canWrite && unsaved) {
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
    if (canWrite && unsaved) {
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
          <BoyName boy={b} classId={classId} onSaved={refetch} />
          {previousAbsent.has(b.id) && (
            <span
              className="att-absent-x"
              title="غاب الجمعة اللي فاتت"
              aria-label="غاب الجمعة اللي فاتت"
            >
              ✕
            </span>
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
            render: (b) => {
              const locked = isLocked(b.id)
              const rowEdit = editing.has(b.id)
              return (
                <div className="att-marks">
                  <AttMark
                    type="present"
                    checked={getMark(b.id).present}
                    disabled={locked}
                    // un-ticking presence also un-ticks the mass (mass implies presence)
                    onToggle={(v) =>
                      setMark(b.id, v ? { present: true } : { present: false, liturgy: false })
                    }
                  />
                  <AttMark
                    type="liturgy"
                    checked={Boolean(getMark(b.id).liturgy)}
                    disabled={locked}
                    // ticking the mass ticks presence too — you can't attend mass and be absent
                    onToggle={(v) =>
                      setMark(b.id, v ? { liturgy: true, present: true } : { liturgy: false })
                    }
                  />

                  {locked && (
                    <IconButton
                      icon={<Icon name="edit" size={15} />}
                      label="تعديل"
                      onClick={() =>
                        setEditing((s) => {
                          const next = new Set(s)
                          next.add(b.id)
                          return next
                        })
                      }
                    />
                  )}

                  {rowEdit && (
                    <>
                      <IconButton
                        icon={<Icon name="check" size={16} />}
                        label="حفظ تعديل الولد"
                        disabled={rowSaving === b.id || !rowChanged(b.id)}
                        onClick={() => saveRow(b.id)}
                      />
                      <IconButton
                        icon={<Icon name="close" size={15} />}
                        label="إلغاء التعديل"
                        onClick={() => cancelRow(b.id)}
                      />
                    </>
                  )}
                </div>
              )
            },
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

      <Toolbar className="toolbar--scroll">
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
      </Toolbar>

      {/* on the phone the toolbar scrolls away, so the search gets its own
          sticky bar that stays reachable while the list scrolls */}
      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

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
                  <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openAddBoy}>
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
            className="att-table"
          />
        )}
      </div>

      {canWrite && counts.total > 0 && (
        <>
        <div className="att-savebar att-savebar--compact">
          {allDone && (
            <div className="summary-bar__stats">
              <span className="badge badge--gold">خلصت — الكل اتعلّم</span>
            </div>
          )}

          <div className="row" style={{ gap: 10 }}>
            {unsaved && <Badge kind="gold" dot>فيه تعديلات لمتحفظش</Badge>}
            {canAdd && (
              <Button
                variant="secondary"
                icon={<Icon name="plus" size={16} />}
                onClick={openAddBoy}
              >
                إضافة ولد
              </Button>
            )}
            <Button variant="accent" loading={saving} disabled={!unsaved} onClick={save} icon={<Icon name="check" size={16} />}>
              حفظ الحضور
            </Button>
          </div>
        </div>
        {/* reserves room for the fixed save bar on the phone */}
        <div className="att-savebar-space" aria-hidden="true" />
        </>
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
