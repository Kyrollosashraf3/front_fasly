import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { BoyAPI, FollowUpAPI, GroupAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { Input, SearchInput, Select } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { FlagDot } from '../boys/BoyForm'
import { followLabel } from '../boys/BoyProfile'
import { formatDate, lastFridayISO, todayISO } from '../../lib/format'
import './followup.css'

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
 * Roster: the selected servant's group (falls back to the whole class).
 * Save walks only the rows that actually changed: POST for new, PATCH for edits.
 */
export default function FollowUpPage() {
  const { classId } = useParams()
  const { classLabel, can, user, isBoy, isServant } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const label = classLabel(classId)
  usePageTitle(`الافتقاد — ${label}`)

  const canWrite = can.writeFollowUp(user)
  const myTeacherId = user?.teacher_id ?? null

  const [date, setDate] = useState(lastFridayISO())
  const [teacherId, setTeacherId] = useState(isServant ? String(myTeacherId || '') : '')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [historyDate, setHistoryDate] = useState('')

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const boys = await BoyAPI.list({ class_id: classId })
      const teachers = isBoy ? [] : await TeacherAPI.list({ class_id: classId }).catch(() => [])
      const groups = isBoy ? null : await GroupAPI.list({ class_id: classId }).catch(() => null)
      const existing = await FollowUpAPI.list({ class_id: classId, action_date: date })
      return { boys, teachers, groups, existing }
    },
    [classId, date, isBoy],
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
    if (!teacherId) return all
    const group = data?.groups?.groups?.find((g) => String(g.teacher_id) === String(teacherId))
    if (!group) return []
    const ids = new Set(group.boys.map((b) => b.boy_id))
    return all.filter((b) => ids.has(b.id))
  }, [data, teacherId])

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return roster.filter((b) => {
      if (q && !b.boy_name.toLowerCase().includes(q) && !(b.phone || '').includes(q)) return false
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

  const counts = useMemo(
    () => ({
      done: roster.filter((b) => draft[b.id]?.status).length,
      total: roster.length,
    }),
    [roster, draft],
  )

  const askNote = async (boy) => {
    const note = await modal.prompt({ title: `ملاحظة — ${boy.boy_name}`, value: noteOf(boy.id) })
    if (note !== null) setNoteFor(boy.id, note)
  }

  const save = async () => {
    const targetTeacher = Number(teacherId) || myTeacherId || data?.teachers?.[0]?.id
    if (!targetTeacher) {
      toast.error('اختر الخادم الأول.')
      return
    }

    const serverByBoy = new Map((data?.existing || []).map((r) => [r.boy_id, r]))
    const ops = []
    for (const boy of roster) {
      const value = draft[boy.id]?.status
      if (!value) continue
      const note = draft[boy.id]?.note || null
      const remote = serverByBoy.get(boy.id)
      if (remote && remote.status === value && (remote.note || '') === note) continue
      ops.push(
        remote
          ? FollowUpAPI.update(remote.id, { status: value, note })
          : FollowUpAPI.create({
              teacher_id: targetTeacher,
              boy_id: boy.id,
              status: value,
              action_date: date,
              note,
            }),
      )
    }

    if (!ops.length) {
      toast.info('مفيش تعديلات جديدة.')
      return
    }

    setSaving(true)
    try {
      await Promise.all(ops)
      toast.success(`تم حفظ ${ops.length} افتقاد.`)
      await refetch()
    } catch (err) {
      toast.error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
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
    { enabled: !isBoy },
  )

  const historyRows = useMemo(() => (history || []).slice(0, 50), [history])

  const nameOfTeacher = (id) =>
    data?.teachers?.find((t) => t.id === id)?.teacher_name || `خادم #${id}`
  const nameOfBoy = (id) => roster.find((b) => b.id === id)?.boy_name || `ولد #${id}`

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
      render: (b) => (
        <span className="table__name">
          <FlagDot show={b.issue_flag} />
          {b.boy_name}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الافتقاد',
      width: 170,
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
  ]

  const historyColumns = [
    { key: 'action_date', label: 'التاريخ', width: 130, render: (r) => formatDate(r.action_date, { withDay: false }) },
    { key: 'teacher_id', label: 'الخادم', width: 150, render: (r) => nameOfTeacher(r.teacher_id) },
    { key: 'boy_id', label: 'الولد', render: (r) => nameOfBoy(r.boy_id) },
    {
      key: 'status',
      label: 'الطريقة',
      width: 130,
      render: (r) => <Badge kind={KIND[r.status] || 'neutral'}>{followLabel(r.status)}</Badge>,
    },
    { key: 'note', label: 'ملاحظة', render: (r) => r.note || <span className="muted xsmall">—</span> },
    {
      key: 'actions',
      label: '',
      width: 90,
      align: 'end',
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

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الفصول</a>
            <span aria-hidden="true">/</span>
            <a href={`#/class/${classId}`}>{label}</a>
            <span aria-hidden="true">/</span>
            <span>الافتقاد</span>
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
        {!isBoy && (
          <label className="row small bold" style={{ gap: 8 }}>
            <Icon name="servant" size={16} />
            <Select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="select--plain"
              style={{ minWidth: 190 }}
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
            onChange={(e) => setDate(e.target.value)}
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
        {loading ? (
          <SkeletonRows rows={7} cols={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="heart"
            title={roster.length === 0 ? 'مفيش أولاد في المجموعة' : 'لا توجد نتائج'}
            message={
              roster.length === 0
                ? 'وزّع الأولاد على الخادم من صفحة المجموعات أولًا.'
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
          <Toolbar>
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
              <Table columns={historyColumns} rows={historyRows} rowKey={(r) => r.id} compact />
            )}
          </div>
        </>
      )}
    </>
  )
}
