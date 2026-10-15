import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useUnsavedGuard } from '../../context/UnsavedChangesContext'
import { useClassScope, useDebounced, useQuery } from '../../hooks'
import { AttendAPI, BoyAPI, FollowUpAPI, GroupAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { ContactActions } from '../../components/ui/ContactActions'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { Input, SearchInput, Select } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { followLabel } from '../boys/BoyProfile'
import { formatDate, formatPercent, todayISO } from '../../lib/format'
import { normalizeSearch } from '../../lib/search'

const STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'call', label: 'مكالمة' },
  { value: 'visit', label: 'زيارة منزل' },
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'no_answer', label: 'لا يوجد رد' },
  { value: 'other', label: 'أخرى' },
]

const KIND = { call: 'blue', visit: 'green', whatsapp: 'green', no_answer: 'red', other: 'neutral' }

/**
 * FollowUpPage — the weekly avcation sheet + its history.
 *
 * Roster: every boy in the class, so a servant can log a follow-up for any of
 * them (managers can narrow it down to one servant's group). Save walks only the
 * rows that actually changed: POST for new, PATCH for edits.
 */
export default function FollowUpPage() {
  const { classLabel, can, user, isBoy, isServant } = useAuth()
  const scope = useClassScope()
  const { multi, classes, setPicked, firstClassId, isGlobal } = scope
  // A follow-up sheet always needs one class: fall back to the first until picked.
  const classId = scope.classId || firstClassId
  const toast = useToast()
  const modal = useModal()

  const label = classId ? classLabel(classId) : ''
  usePageTitle(isGlobal ? 'الافتقاد' : `الافتقاد — ${label}`)

  const canWrite = can.writeFollowUp(user)
  const myTeacherId = user?.teacher_id ?? null
  // "كل الخدام" is an admin/super-admin tool: a servant only ever writes his
  // own follow-ups, but he can log one for any boy in his class — so the roster
  // stays the whole class and the picker is hidden from him.
  const showServantFilter = can.manageClasses(user)

  const [date, setDate] = useState(todayISO())
  const [teacherId, setTeacherId] = useState(isServant ? String(myTeacherId || '') : '')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [historyDate, setHistoryDate] = useState('')
  const [expanded, setExpanded] = useState(null)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [boys, teachers, groups, existing, attends] = await Promise.all([
        BoyAPI.list({ class_id: classId }),
        isBoy ? Promise.resolve([]) : TeacherAPI.list({ class_id: classId }).catch(() => []),
        isBoy ? Promise.resolve(null) : GroupAPI.list({ class_id: classId }).catch(() => null),
        FollowUpAPI.list({ class_id: classId, action_date: date }),
        // The boy's own Friday record — the follow-up sheet is where his past
        // attendance is judged, so it rides along with the sheet request.
        AttendAPI.list({ class_id: classId }).catch(() => []),
      ])
      return { boys, teachers, groups, existing, attends }
    },
    [classId, date, isBoy],
    { enabled: Boolean(classId) },
  )

  useEffect(() => {
    if (!data) return
    const next = {}
    for (const row of data.existing || []) next[row.boy_id] = row
    setDraft(next)
  }, [data])

  /** Which boys are on this sheet? */
  const roster = useMemo(() => {
    const all = data?.boys || []
    // A servant sees the whole class; a manager can narrow to one group.
    if (isServant || !teacherId) return all
    const group = data?.groups?.groups?.find((g) => String(g.teacher_id) === String(teacherId))
    if (!group) return []
    const ids = new Set(group.boys.map((b) => b.boy_id))
    return all.filter((b) => ids.has(b.id))
  }, [data, teacherId, isServant])

  /** boy_id -> the servant responsible for him (his group owner). */
  const groupOwnerByBoy = useMemo(() => {
    const map = new Map()
    for (const g of data?.groups?.groups || []) {
      for (const b of g.boys) map.set(b.boy_id, g.teacher_id)
    }
    return map
  }, [data])

  /** Boys who already have a follow-up row on this sheet (not a new entry). */
  const loggedBoyIds = useMemo(
    () => new Set((data?.existing || []).map((r) => r.boy_id)),
    [data],
  )

  const rows = useMemo(() => {
    const q = normalizeSearch(debounced)
    return roster.filter((b) => {
      if (q && !normalizeSearch(b.boy_name).includes(q) && !normalizeSearch(b.phone).includes(q)) return false
      if (status === 'done' && !draft[b.id]) return false
      if (status === 'todo' && draft[b.id]) return false
      return true
    })
  }, [roster, debounced, status, draft])

  const statusOf = (boyId) => draft[boyId]?.status || ''
  const noteOf = (boyId) => draft[boyId]?.note || ''

  const setStatusFor = (boyId, value) =>
    setDraft((d) => ({ ...d, [boyId]: { ...(d[boyId] || {}), status: value } }))

  const setNoteFor = (boyId, value) =>
    setDraft((d) => ({ ...d, [boyId]: { ...(d[boyId] || {}), note: value } }))

  /** The servant credited for a boy's follow-up: the chosen one, else his
      group owner, else the toolbar's current servant pick. */
  const mentorOf = (boyId) =>
    draft[boyId]?.teacher_id ??
    groupOwnerByBoy.get(boyId) ??
    (teacherId ? Number(teacherId) : '')

  const setMentorFor = (boyId, value) =>
    setDraft((d) => ({
      ...d,
      [boyId]: { ...(d[boyId] || {}), teacher_id: value ? Number(value) : null },
    }))

  const counts = useMemo(
    () => ({
      done: roster.filter((b) => draft[b.id]?.status).length,
      total: roster.length,
    }),
    [roster, draft],
  )

  /** Server rows vs the draft — drives the unsaved-changes guard. */
  const dirty = useMemo(() => {
    if (!data) return false
    const server = new Map((data.existing || []).map((r) => [r.boy_id, r]))
    for (const [boyId, val] of Object.entries(draft)) {
      if (!val?.status) continue
      const remote = server.get(Number(boyId))
      if (!remote) return true
      if (remote.status !== val.status) return true
      if ((remote.note || '') !== (val.note || '')) return true
    }
    return false
  }, [data, draft])

  /** boyId -> every Friday recorded BEFORE the sheet on screen, newest first. */
  const fridaysByBoy = useMemo(() => {
    const map = new Map()
    for (const row of data?.attends || []) {
      if (String(row.date) >= date) continue
      const list = map.get(row.boy_id)
      if (list) list.push(row)
      else map.set(row.boy_id, [row])
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    }
    return map
  }, [data, date])

  /** The Friday right before this sheet — nothing recorded means no verdict. */
  const lastFridayOf = (boyId) => (fridaysByBoy.get(boyId) || [])[0] || null

  /** How often he turned up on the Fridays that were recorded. */
  const rateOf = (boyId) => {
    const list = fridaysByBoy.get(boyId) || []
    if (!list.length) return null
    const present = list.filter((r) => r.present).length
    return Math.round((present / list.length) * 100)
  }

  const askNote = async (boy) => {
    const note = await modal.prompt({ title: `ملاحظة — ${boy.boy_name}`, value: noteOf(boy.id) })
    if (note !== null) setNoteFor(boy.id, note)
  }

  const save = async () => {
    const fallback = Number(teacherId) || myTeacherId || data?.teachers?.[0]?.id

    const serverByBoy = new Map((data?.existing || []).map((r) => [r.boy_id, r]))
    const ops = []
    let missingMentor = null
    for (const boy of roster) {
      const value = draft[boy.id]?.status
      if (!value) continue
      const note = draft[boy.id]?.note || null
      const remote = serverByBoy.get(boy.id)
      if (remote && remote.status === value && (remote.note || '') === note) continue
      // A new row is credited to the boy's responsible servant (or the picked
      // one); an edit keeps the servant that logged it.
      const mentor = mentorOf(boy.id) || fallback
      if (!remote && !mentor) {
        missingMentor = boy
        break
      }
      ops.push(
        remote
          ? FollowUpAPI.update(remote.id, { status: value, note })
          : FollowUpAPI.create({
              teacher_id: mentor,
              boy_id: boy.id,
              status: value,
              action_date: date,
              note,
            }),
      )
    }

    if (missingMentor) {
      toast.error(`حدد الخادم المسؤول عن ${missingMentor.boy_name}.`)
      return false
    }

    if (!ops.length) {
      toast.info('مفيش تعديلات جديدة.')
      return true
    }

    setSaving(true)
    try {
      await Promise.all(ops)
      toast.success(`تم حفظ ${ops.length} افتقاد.`)
      await refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      refetch()
      return false
    } finally {
      setSaving(false)
    }
  }

  // Warn before leaving with follow-up rows that still have unsaved changes.
  useUnsavedGuard(canWrite && dirty, save, `فيه تعديلات افتقاد لسه متحفظتش ليوم ${formatDate(date)}.`)

  /** Switching the date reloads the sheet — confirm first when it is dirty. */
  const changeDate = async (next) => {
    if (next === date) return
    if (canWrite && dirty) {
      const ok = await modal.confirm({
        title: 'تغيير التاريخ؟',
        message: 'فيه تعديلات افتقاد لسه متحفظتش. لو غيّرت التاريخ هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setDate(next)
  }

  /** Switching the class reloads the sheet — confirm first, then drop the
   *  selected servant (he belongs to the class we just left). */
  const changeClass = async (next) => {
    if (!next || next === classId) return
    if (canWrite && dirty) {
      const ok = await modal.confirm({
        title: 'تغيير الفصل؟',
        message: 'فيه تعديلات افتقاد لسه متحفظتش. لو غيّرت الفصل هتخسرها.',
        confirmLabel: 'تغيير والتجاهل',
        kind: 'danger',
      })
      if (!ok) return
    }
    setPicked(next)
    setTeacherId('')
  }

  /* ------------------------------------------------------------- history */
  const { data: history, loading: historyLoading, refetch: refetchHistory } = useQuery(
    () =>
      FollowUpAPI.list({
        class_id: classId,
        ...(teacherId ? { teacher_id: teacherId } : {}),
        ...(historyDate ? { action_date: historyDate } : {}),
      }),
    [classId, teacherId, historyDate],
    { enabled: !isBoy && Boolean(classId) },
  )

  const historyRows = useMemo(() => (history || []).slice(0, 50), [history])

  const nameOfTeacher = (id) =>
    data?.teachers?.find((t) => t.id === id)?.teacher_name || `خادم #${id}`
  const nameOfBoy = (id) => roster.find((b) => b.id === id)?.boy_name || `ولد #${id}`
  /** The same row as a record, so its name cell carries the ✎ marker. */
  const boyOf = (id) => roster.find((b) => b.id === id) || { id, boy_name: nameOfBoy(id) }

  const editHistory = async (row) => {
    const next = await modal.prompt({ title: 'تعديل الملاحظة', value: row.note || '' })
    if (next === null) return
    try {
      await FollowUpAPI.update(row.id, { note: next })
      toast.success('تم التعديل.')
      refetchHistory()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const deleteHistory = async (row) => {
    const ok = await modal.confirm({ title: 'حذف هذا الافتقاد؟', confirmLabel: 'حذف' })
    if (!ok) return
    try {
      await FollowUpAPI.remove(row.id)
      toast.success('تم الحذف.')
      refetchHistory()
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const columns = [
    {
      key: 'boy_name',
      label: 'الولد',
      mobile: 'الولد',
      render: (b) => <BoyName boy={b} className="table__name" classId={classId} onSaved={refetch} />,
    },
    ...(showServantFilter
      ? [
          {
            key: 'teacher_id',
            label: 'الخادم',
            width: 168,
            mobile: 'الخادم',
            render: (b) => {
              // An existing row keeps the servant who logged it; a new row
              // defaults to the boy's responsible servant and can be changed.
              if (loggedBoyIds.has(b.id)) {
                return <span className="small">{nameOfTeacher(mentorOf(b.id))}</span>
              }
              return (
                <Select
                  value={String(mentorOf(b.id) || '')}
                  onChange={(e) => setMentorFor(b.id, e.target.value)}
                  aria-label={`الخادم المسؤول عن ${b.boy_name}`}
                >
                  <option value="">—</option>
                  {(data?.teachers || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacher_name}
                    </option>
                  ))}
                </Select>
              )
            },
          },
        ]
      : []),
    {
      key: 'contact',
      label: 'تواصل',
      width: 96,
      align: 'center',
      mobile: 'تواصل',
      render: (b) => <ContactActions phone={b.phone} phone2={b.phone_2} />,
    },
    {
      key: 'last_friday',
      label: 'الجمعة الماضية',
      width: 132,
      mobile: 'الجمعة الماضية',
      render: (b) => {
        const row = lastFridayOf(b.id)
        if (!row) return <span className="muted xsmall">لا يوجد تسجيل</span>
        return (
          <span className="att-last">
            {row.present ? (
              <span className="badge badge--green">حاضر</span>
            ) : (
              <span className="badge badge--red">غائب</span>
            )}
            <span className="xsmall muted">{formatDate(row.date)}</span>
          </span>
        )
      },
    },
    {
      key: 'rate',
      label: 'نسبة الحضور',
      width: 116,
      align: 'center',
      mobile: 'نسبة الحضور',
      render: (b) => {
        const rate = rateOf(b.id)
        const list = fridaysByBoy.get(b.id) || []
        if (rate === null) return <span className="muted xsmall">—</span>
        return (
          <span
            className="att-rate"
            title={`${list.length} جمعة مسجّلة`}
            style={{ '--rate': `${rate}%` }}
          >
            <span className="att-rate__bar" aria-hidden="true" />
            <span className="att-rate__num">{formatPercent(rate)}</span>
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'الافتقاد',
      width: 170,
      mobile: 'الافتقاد',
      render: (b) => (
        <Select
          value={statusOf(b.id)}
          disabled={!canWrite}
          aria-label={`افتقاد: ${b.boy_name}`}
          onChange={(e) => setStatusFor(b.id, e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: 'note',
      label: 'ملاحظة',
      mobile: 'ملاحظة',
      render: (b) => {
        const note = noteOf(b.id)
        if (!canWrite) return note ? <span className="small">{note}</span> : <span className="muted xsmall">—</span>
        return (
          <button type="button" className="note-btn" onClick={() => askNote(b)}>
            <Icon name="note" size={15} className={note ? 'note-indicator' : ''} />
            <span className="small truncate" style={{ maxWidth: 220 }}>
              {note || 'أضف ملاحظة'}
            </span>
          </button>
        )
      },
    },
    {
      key: 'details',
      label: '',
      width: 116,
      align: 'end',
      mobile: '',
      render: (b) => {
        const open = expanded === b.id
        const count = (fridaysByBoy.get(b.id) || []).length
        return (
          <button
            type="button"
            className={`att-details${open ? ' is-open' : ''}`}
            aria-expanded={open}
            title={`${count} جمعة مسجّلة`}
            onClick={() => setExpanded(open ? null : b.id)}
          >
            <Icon name="history" size={15} />
            <span>{open ? 'إخفاء' : 'التفاصيل'}</span>
            <Icon name="chevronDown" size={14} className="att-details__chev" />
          </button>
        )
      },
    },
  ]

  /** Expanded row: every recorded Friday before this sheet, with his note. */
  const fridayPanel = (boy) => {
    const list = fridaysByBoy.get(boy.id) || []
    const present = list.filter((r) => r.present).length
    const rate = rateOf(boy.id)

    return (
      <div className="att-history">
        <div className="att-history__head">
          <span className="att-history__title">
            <Icon name="history" size={16} />
            حضور {boy.boy_name}
          </span>
          <span className="att-history__summary">
            {list.length ? (
              <>
                <span className="badge badge--green">حاضر {present}</span>
                <span className="badge badge--red">غائب {list.length - present}</span>
                <span className="badge badge--gold">{formatPercent(rate)} من {list.length} جمعة</span>
              </>
            ) : (
              <span className="muted small">لسه مفيش حضور متسجل قبل {formatDate(date)}</span>
            )}
          </span>
        </div>

        {list.length > 0 && (
          <ul className="att-history__list">
            {list.map((r) => (
              <li key={r.id ?? r.date} className={r.present ? 'is-present' : 'is-absent'}>
                <span className="att-history__date">{formatDate(r.date)}</span>
                {r.present ? (
                  <span className="badge badge--green">حاضر</span>
                ) : (
                  <span className="badge badge--red">غائب</span>
                )}
                {r.note && <span className="att-history__note">{r.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const historyColumns = [
    { key: 'action_date', label: 'التاريخ', width: 130, mobile: 'التاريخ', render: (r) => formatDate(r.action_date, { withDay: false }) },
    { key: 'teacher_id', label: 'الخادم', width: 150, mobile: 'الخادم', render: (r) => nameOfTeacher(r.teacher_id) },
    { key: 'boy_id', label: 'الولد', mobile: 'الولد', render: (r) => <BoyName boy={boyOf(r.boy_id)} classId={classId} onSaved={refetchHistory} /> },
    {
      key: 'status',
      label: 'الطريقة',
      width: 130,
      mobile: 'الطريقة',
      render: (r) => <Badge kind={KIND[r.status] || 'neutral'}>{followLabel(r.status)}</Badge>,
    },
    { key: 'note', label: 'ملاحظة', mobile: 'ملاحظة', render: (r) => r.note || <span className="muted xsmall">—</span> },
    {
      key: 'actions',
      label: '',
      width: 90,
      align: 'end',
      mobile: '',
      render: (r) =>
        canWrite ? (
          <div className="table__actions">
            <IconButton icon={<Icon name="edit" size={15} />} label="تعديل" onClick={() => editHistory(r)} />
            {can.writeDirectory(user) && (
              <IconButton icon={<Icon name="trash" size={15} />} label="حذف" danger onClick={() => deleteHistory(r)} />
            )}
          </div>
        ) : null,
    },
  ]

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
          <h1 className="page-head__title">الافتقاد الأسبوعي</h1>
          <div className="page-head__sub">
            {formatDate(date)} · {counts.done} من {counts.total} اتعلّموا
          </div>
        </div>
        <Link className="btn btn-secondary" to={`/class/${classId}/attendance`}>
          <Icon name="calendar" size={15} />
          الحضور
        </Link>
      </div>

      <Toolbar>
        {multi && (
          <ClassFilter
            value={scope.classId || firstClassId}
            onChange={changeClass}
            classes={classes}
          />
        )}
        {showServantFilter && (
          <label className="row small bold" style={{ gap: 8 }}>
            <Icon name="servant" size={16} />
            <Select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="select--plain"
              style={{ minWidth: 190 }}
              aria-label="اختيار الخادم"
            >
              <option value="">كل الخدام</option>
              {(data?.teachers || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacher_name}
                </option>
              ))}
            </Select>
          </label>
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
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'الكل', count: counts.total },
            { value: 'todo', label: 'المتبقي', count: counts.total - counts.done },
            { value: 'done', label: 'المتسجل', count: counts.done },
          ]}
        />

        <ToolbarSpacer />
      </Toolbar>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {busy ? (
          <SkeletonRows rows={7} cols={6} />
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
          <Table
            columns={columns}
            rows={rows}
            rowKey={(b) => b.id}
            rowClassName={(b) => (draft[b.id]?.status ? 'is-present' : '')}
            renderExpanded={(b) => (expanded === b.id ? fridayPanel(b) : null)}
            stackOnMobile
          />
        )}
      </div>

      {canWrite && roster.length > 0 && (
        <div className="att-savebar">
          <div className="summary-bar__stats">
            <span className="summary-bar__stat">
              متسجل <span className="summary-bar__num">{counts.done}</span>
            </span>
            <span className="summary-bar__stat small" style={{ opacity: 0.8 }}>
              من {counts.total}
            </span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Button variant="accent" loading={saving} onClick={save} icon={<Icon name="check" size={16} />}>
              حفظ الافتقاد
            </Button>
          </div>
        </div>
      )}

      {!isBoy && (
        <>
          <div className="section-title">السجل السابق</div>
          <Toolbar className="toolbar--static">
            <label className="row small bold" style={{ gap: 8 }}>
              <Icon name="filter" size={15} />
              <Input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                style={{ width: 160 }}
              />
            </label>
            {historyDate && (
              <Button variant="ghost" size="sm" onClick={() => setHistoryDate('')}>
                مسح الفلتر
              </Button>
            )}
            <ToolbarSpacer />
            <span className="small muted">{history?.length ?? 0} سجل</span>
          </Toolbar>

          <div style={{ marginTop: 'var(--sp-3)' }}>
            {historyLoading ? (
              <SkeletonRows rows={5} cols={6} />
            ) : !historyRows.length ? (
              <EmptyState icon="heart" title="لا يوجد سجل" message="لسه مفيش افتقادات مسجّلة." inline />
            ) : (
              <Table columns={historyColumns} rows={historyRows} rowKey={(r) => r.id} stackOnMobile compact />
            )}
          </div>
        </>
      )}
    </>
  )
}
