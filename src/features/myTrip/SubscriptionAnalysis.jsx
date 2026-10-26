import { useEffect, useMemo, useState } from 'react'
import { Table } from '../../components/ui/Table'
import { SearchInput, Select } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, Loading, EmptyState } from '../../components/ui/States'
import { SubscriptionAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { num } from '../../lib/format'
import './myTrip.css'

const STATUS = {
  paid: { kind: 'green', label: 'مكتمل' },
  partial: { kind: 'gold', label: 'دفع جزئي' },
  none: { kind: 'neutral', label: 'لم يدفع' },
}

const statusOf = (row) =>
  (row.remaining ?? 0) <= 0 ? STATUS.paid : (row.total_paid ?? 0) > 0 ? STATUS.partial : STATUS.none

/**
 * SubscriptionAnalysis — the "اشتراكات" action.
 *
 * Lists the boys of the trip's class who paid, with what they paid and what is
 * still due. The name filter and the sortable paid/remaining headers cover the
 * analysis the amin needs without another endpoint.
 */
export default function SubscriptionAnalysis({ tripId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [mode, setMode] = useState('paid') // paid | all

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
    return () => {
      cancelled = true
    }
  }, [tripId])

  const filtered = useMemo(() => {
    const q = normalizeSearch(nameFilter)
    return rows.filter((r) => {
      if (mode === 'paid' && (r.total_paid ?? 0) <= 0) return false
      if (q && !normalizeSearch(r.boy_name).includes(q)) return false
      return true
    })
  }, [rows, nameFilter, mode])

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

  const columns = [
    {
      key: 'boy_name',
      label: 'اسم الولد',
      sortValue: (r) => r.boy_name,
      render: (r) => r.boy_name,
    },
    {
      key: 'paid',
      label: 'المبلغ المدفوع',
      align: 'end',
      sortValue: (r) => r.total_paid ?? 0,
      render: (r) => <span className="mytrip__amount">{num(r.total_paid ?? 0)} جنيه</span>,
    },
    {
      key: 'remaining',
      label: 'الباقي عليه',
      align: 'end',
      sortValue: (r) => Math.max(0, r.remaining ?? 0),
      render: (r) => (
        <span className={`mytrip__amount${(r.remaining ?? 0) > 0 ? ' mytrip__amount--due' : ''}`}>
          {num(Math.max(0, r.remaining ?? 0))} جنيه
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      align: 'center',
      width: 110,
      sortValue: (r) => statusOf(r).label,
      render: (r) => {
        const status = statusOf(r)
        return <Badge kind={status.kind}>{status.label}</Badge>
      },
    },
  ]

  return (
    <div className="mytrip__panel">
      <div className="mytrip__panel-head">
        <div>
          <h3 className="mytrip__panel-title">اشتراكات الرحلة</h3>
          <p className="mytrip__panel-sub">
            المدفوع: <strong>{num(totals.paid)} جنيه</strong> • الباقي:{' '}
            <strong>{num(totals.remaining)} جنيه</strong>
          </p>
        </div>
      </div>

      <div className="mytrip__filters">
        <SearchInput value={nameFilter} onChange={setNameFilter} placeholder="فلتر باسم الولد..." />
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          aria-label="عرض الاشتراكات"
          style={{ minWidth: 170 }}
        >
          <option value="paid">الذين دفعوا</option>
          <option value="all">كل أولاد الفصل</option>
        </Select>
      </div>

      {loading ? (
        <Loading label="جارٍ تحميل الاشتراكات..." />
      ) : error ? (
        <ErrorState error={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="لا توجد اشتراكات مطابقة"
          message={mode === 'paid' ? 'لم يدفع أحد بعد، أو لا يوجد اسم مطابق للفلتر.' : 'لا يوجد أولاد مطابقون للفلتر.'}
        />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.boy_id}
          stackOnMobile
          sortable
          initialSort={{ key: 'paid', dir: 'desc' }}
        />
      )}
    </div>
  )
}
