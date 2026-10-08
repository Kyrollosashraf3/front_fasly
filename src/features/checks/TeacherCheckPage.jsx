import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { CheckAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Input, SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { formatDate, lastFridayISO, todayISO } from '../../lib/format'
import './checks.css'

const FLAGS = [
  { key: 'attend', label: 'حاضر' },
  { key: 'prepare', label: 'تحضير الدرس' },
  { key: 'liturgy', label: 'القداس' },
  { key: 'follow', label: 'افتقاد' },
]

/**
 * TeacherCheckPage — the amin's weekly review of his servants.
 * Managers write; a servant (or boy) sees the sheet read-only (a boy: 403).
 */
export default function TeacherCheckPage() {
  const { classId } = useParams()
  const { classLabel, can, user } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const label = classLabel(classId)
  usePageTitle(`متابعة الخدام — ${label}`)

  const canWrite = can.writeChecks(user)

  const [date, setDate] = useState(lastFridayISO())
  const [search, setSearch] = useState('')
  const [marks, setMarks] = useState({})
  const [saving, setSaving] = useState(false)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [teachers, checks] = await Promise.all([
        TeacherAPI.list({ class_id: classId }),
        CheckAPI.list({ class_id: classId, action_date: date }),
      ])
      return { teachers, checks }
    },
    [classId, date],
  )

  useEffect(() => {
    if (!data) return
    const next = {}
    for (const c of data.checks || []) {
      next[c.teacher_id] = {
        attend: c.attend,
        prepare: c.prepare,
        liturgy: c.liturgy,
        follow: c.follow,
        note: c.note || '',
      }
    }
    setMarks(next)
  }, [data])

  const getMark = (id) =>
    marks[id] || { attend: false, prepare: false, liturgy: false, follow: false, note: '' }

  const setFlag = (id, flag, value) =>
    setMarks((m) => ({ ...m, [id]: { ...getMark(id), [flag]: value } }))

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return (data?.teachers || []).filter((t) => !q || t.teacher_name.toLowerCase().includes(q))
  }, [data, debounced])

  const dirty = useMemo(() => {
    if (!data) return false
    const server = new Map((data.checks || []).map((c) => [c.teacher_id, c]))
    for (const t of data.teachers || []) {
      const local = marks[t.id]
      const remote = server.get(t.id)
      if (!remote && !local) continue
      if (!remote) return true
      const base = { attend: false, prepare: false, liturgy: false, follow: false, note: '' }
      const l = local || base
      for (const f of ['attend', 'prepare', 'liturgy', 'follow']) {
        if (Boolean(l[f]) !== Boolean(remote[f])) return true
      }
      if ((l.note || '') !== (remote.note || '')) return true
    }
    return false
  }, [data, marks])

  const stats = useMemo(() => {
    const total = data?.teachers?.length || 0
    const done = (data?.teachers || []).filter((t) => getMark(t.id).attend).length
    return { total, done }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, marks])

  const setAllPresent = (value) => {
    setMarks((m) => {
      const next = { ...m }
      for (const t of data?.teachers || []) next[t.id] = { ...getMark(t.id), attend: value }
      return next
    })
  }

  const askNote = async (teacher) => {
    const note = await modal.prompt({ title: `ملاحظة — ${teacher.teacher_name}`, value: getMark(teacher.id).note })
    if (note !== null) setMarks((m) => ({ ...m, [teacher.id]: { ...getMark(teacher.id), note } }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await CheckAPI.saveBulk({
        date,
        items: (data?.teachers || []).map((t) => ({
          teacher_id: t.id,
          ...getMark(t.id),
          note: getMark(t.id).note || null,
        })),
      })
      toast.success(`تم حفظ متابعة ${formatDate(date)}.`)
      await refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'teacher_name',
      label: 'الخادم',
      mobile: 'الخادم',
      render: (t) => (
        <div className="check-person">
          <span className="table__name">{t.teacher_name}</span>
          {t.phone && <span className="xsmall muted ltr">{t.phone}</span>}
        </div>
      ),
    },
    ...FLAGS.map((f) => ({
      key: f.key,
      label: f.label,
      width: 110,
      align: 'center',
      mobile: f.label,
      render: (t) => (
        <input
          key={f.key}
          type="checkbox"
          className="att-check"
          aria-label={`${f.label}: ${t.teacher_name}`}
          checked={Boolean(getMark(t.id)[f.key])}
          disabled={!canWrite}
          onChange={(e) => setFlag(t.id, f.key, e.target.checked)}
        />
      ),
    })),
    {
      key: 'note',
      label: 'ملاحظة',
      width: 200,
      mobile: 'ملاحظة',
      render: (t) => {
        const note = getMark(t.id).note
        if (!canWrite) return note ? <span className="small">{note}</span> : <span className="muted xsmall">—</span>
        return (
          <button type="button" className="note-btn" onClick={() => askNote(t)} title="إضافة ملاحظة">
            <Icon name="note" size={15} className={note ? 'note-indicator' : ''} />
            <span className="small truncate" style={{ maxWidth: 130 }}>
              {note || 'أضف'}
            </span>
          </button>
        )
      },
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
            <span>متابعة الخدام</span>
          </nav>
          <h1 className="page-head__title">متابعة الخدام</h1>
          <div className="page-head__sub">{formatDate(date)}</div>
        </div>
        <Link className="btn btn-secondary" to={`/class/${classId}/teachers`}>
          <Icon name="chevronStart" size={15} />
          دليل الخدام
        </Link>
      </div>

      <Toolbar>
        <label className="row small bold" style={{ gap: 8 }}>
          <Icon name="calendar" size={16} />
          <Input
            type="date"
            value={date}
            max={todayISO()}
            disabled={!canWrite}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 160 }}
          />
        </label>

        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />
        <ToolbarSpacer />

        {canWrite && (
          <div className="toolbar__group">
            <Button variant="ghost" size="sm" onClick={() => setAllPresent(true)}>
              الكل حاضر
            </Button>
            <span className="badge badge--navy">
              {stats.done} / {stats.total} اتعلّموا
            </span>
          </div>
        )}
      </Toolbar>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {loading ? (
          <SkeletonRows rows={6} cols={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
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
          <Table columns={columns} rows={rows} rowKey={(t) => t.id} stackOnMobile />
        )}
      </div>

      {canWrite && stats.total > 0 && (
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
            {dirty && <Badge kind="gold" dot>تعديلات غير محفوظة</Badge>}
            <Button variant="accent" loading={saving} disabled={!dirty} onClick={save} icon={<Icon name="check" size={16} />}>
              حفظ المتابعة
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
