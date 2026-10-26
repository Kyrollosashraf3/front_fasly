import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { TaskValueAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { formatShort } from '../../lib/format'
import './tasks.css'

const FILTERS = [
  { value: 'pending', label: 'مستحقات' },
  { value: 'delivered', label: 'استُلمت' },
  { value: 'all', label: 'الكل' },
]

/**
 * TaskDues — the hand-over sheet for one competition.
 *
 * Every recitation is a row: the boy, the servant who heard him and the طايو
 * he is owed. Ticking a row only marks it locally; one "حفظ" at the bottom
 * sends every change to `PATCH /task-values/bulk`, so the sheet behaves like
 * the Friday attendance sheet rather than a form per boy.
 */
export default function TaskDues({ task }) {
  const toast = useToast()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [filter, setFilter] = useState('pending')
  // id -> the tick the servant is about to save. Only changed rows are sent.
  const [ticks, setTicks] = useState({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await TaskValueAPI.list({ task_id: task.id })
      setRows(Array.isArray(data) ? data : [])
      setTicks({})
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [task.id])

  useEffect(() => {
    load()
  }, [load])

  const isReceived = (row) => ticks[row.id] ?? row.received

  const filtered = useMemo(() => {
    const q = normalizeSearch(nameFilter)
    return rows.filter((r) => {
      if (filter === 'pending' && r.received) return false
      if (filter === 'delivered' && !r.received) return false
      if (q && !normalizeSearch(r.boy_name).includes(q)) return false
      return true
    })
  }, [rows, nameFilter, filter])

  const changes = useMemo(
    () =>
      Object.entries(ticks)
        .filter(([id, received]) => {
          const row = rows.find((r) => String(r.id) === id)
          return row && row.received !== received
        })
        .map(([id, received]) => ({ id: Number(id), received })),
    [ticks, rows],
  )

  const totals = useMemo(() => {
    const pending = rows.filter((r) => !r.received)
    return {
      dueCount: pending.length,
      dueValue: pending.reduce((sum, r) => sum + (r.task_value ?? 0), 0),
      deliveredValue: rows
        .filter((r) => r.received)
        .reduce((sum, r) => sum + (r.task_value ?? 0), 0),
    }
  }, [rows])

  const save = async () => {
    if (changes.length === 0) return
    setBusy(true)
    try {
      await TaskValueAPI.saveBulk(changes)
      toast.success(
        changes.length === 1 ? 'تم حفظ الاستلام.' : `تم حفظ ${changes.length} استلام.`,
      )
      await load()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tasks__panel">
      <div className="tasks__panel-head">
        <div>
          <h3 className="tasks__panel-title">مستحقات المسابقة</h3>
          <p className="tasks__panel-sub">
            لسه مستحقات: <strong className="tasks__sub--due">{totals.dueValue} طايو</strong>
            {' '}على {totals.dueCount} ولد
            {totals.deliveredValue > 0 && (
              <> • تسليم: <strong>{totals.deliveredValue} طايو</strong></>
            )}
          </p>
        </div>
      </div>

      <div className="tasks__filters">
        <SearchInput value={nameFilter} onChange={setNameFilter} placeholder="فلتر باسم الولد..." />
        <div className="tasks__seg" role="group" aria-label="فلتر الاستلام">
          {FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`tasks__seg-btn${filter === opt.value ? ' tasks__seg-btn--active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="جارٍ تحميل المستحقات..." />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={rows.length === 0 ? 'لا توجد تسميعات بعد' : 'لا توجد نتائج'}
          message={
            rows.length === 0
              ? 'لم يُسجَّل أي تسميع لهذه المسابقة بعد.'
              : 'لا يوجد ولد مطابق للفلتر المختار.'
          }
        />
      ) : (
        <div className="tasks__due-list">
          {filtered.map((row) => {
            const received = isReceived(row)
            const dirty = changes.some((c) => c.id === row.id)
            return (
              <div
                key={row.id}
                className={`tasks__due-item${dirty ? ' tasks__due-item--dirty' : ''}`}
              >
                <div className="tasks__due-main">
                  <span className="tasks__due-name">{row.boy_name}</span>
                  <span className="tasks__due-server">
                    <Icon name="servant" size={13} />
                    {row.created_by_name || 'غير محدد'} — سمّعه في {formatShort(row.action_date)}
                  </span>
                </div>

                <div className="tasks__due-side">
                  <span className={`tasks__pill ${received ? 'tasks__pill--paid' : 'tasks__pill--due'}`}>
                    <span className="tasks__pill-label">{received ? 'استلم' : 'مستحّق'}</span>
                    <strong className="tasks__pill-val">{row.task_value ?? 0} طايو</strong>
                  </span>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={received}
                      onChange={(e) =>
                        setTicks((t) => ({ ...t, [row.id]: e.target.checked }))
                      }
                    />
                    <span>تسليم الطايو</span>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="tasks__form-actions">
        {changes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTicks({})}
            disabled={busy}
          >
            تجاهل التغييرات
          </Button>
        )}
        <Button variant="primary" onClick={save} loading={busy} disabled={changes.length === 0}>
          حفظ
        </Button>
      </div>
    </div>
  )
}
