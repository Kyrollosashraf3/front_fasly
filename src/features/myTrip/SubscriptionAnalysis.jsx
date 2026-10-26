import { useEffect, useMemo, useState } from 'react'
import { SearchInput } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, Loading, EmptyState } from '../../components/ui/States'
import { SubscriptionAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { num } from '../../lib/format'
import './myTrip.css'

// الأولاد الذين دفعوا فقط — دايمًا
// فلتر الحالة: all | complete | remaining
const statusOf = (r) =>
  (r.remaining ?? 0) <= 0 ? 'complete' : 'remaining'

export default function SubscriptionAnalysis({ tripId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | complete | remaining

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    SubscriptionAPI.getTripSummary(tripId)
      .then((data) => {
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : [])
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [tripId])

  const filtered = useMemo(() => {
    const q = normalizeSearch(nameFilter)
    return rows.filter((r) => {
      // دايمًا نعرض الذين دفعوا فقط
      if ((r.total_paid ?? 0) <= 0) return false
      // فلتر الحالة
      if (statusFilter !== 'all' && statusOf(r) !== statusFilter) return false
      // فلتر الاسم
      if (q && !normalizeSearch(r.boy_name).includes(q)) return false
      return true
    })
  }, [rows, nameFilter, statusFilter])

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          paid: acc.paid + (r.total_paid ?? 0),
          remaining: acc.remaining + Math.max(0, r.remaining ?? 0),
        }),
        { paid: 0, remaining: 0 },
      ),
    [filtered],
  )

  return (
    <div className="mytrip__panel">
      {/* Header */}
      <div className="mytrip__panel-head">
        <div>
          <h3 className="mytrip__panel-title">اشتراكات الرحلة</h3>
          <p className="mytrip__panel-sub">
            المدفوع: <strong>{num(totals.paid)} ج</strong>
            {totals.remaining > 0 && (
              <> • الباقي: <strong className="mytrip__sub--due">{num(totals.remaining)} ج</strong></>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mytrip__filters">
        <SearchInput value={nameFilter} onChange={setNameFilter} placeholder="فلتر باسم الولد..." />
        <div className="mytrip__seg" role="group" aria-label="فلتر الحالة">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'complete', label: 'مكتمل' },
            { value: 'remaining', label: 'الباقي' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`mytrip__seg-btn${statusFilter === opt.value ? ' mytrip__seg-btn--active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Loading label="جارٍ تحميل الاشتراكات..." />
      ) : error ? (
        <ErrorState error={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="لا توجد نتائج"
          message="لا يوجد أولاد مطابقون للفلتر المختار."
        />
      ) : (
        <div className="mytrip__analysis-list">
          {filtered.map((r) => {
            const complete = (r.remaining ?? 0) <= 0
            return (
              <div key={r.boy_id} className="mytrip__analysis-card">
                <div className="mytrip__analysis-card-name">
                  {r.boy_name}
                  <Badge kind={complete ? 'green' : 'gold'}>
                    {complete ? 'مكتمل' : 'جزئي'}
                  </Badge>
                </div>
                <div className="mytrip__analysis-card-amounts">
                  <span className="mytrip__pill mytrip__pill--paid">
                    <span className="mytrip__pill-label">دفع</span>
                    <strong className="mytrip__pill-val">{num(r.total_paid ?? 0)} ج</strong>
                  </span>
                  <span className="mytrip__pill mytrip__pill--due">
                    <span className="mytrip__pill-label">باقي</span>
                    <strong className="mytrip__pill-val">{num(Math.max(0, r.remaining ?? 0))} ج</strong>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
