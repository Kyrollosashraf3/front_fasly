import { useEffect, useMemo, useState } from 'react'
import { Field, Select } from '../../components/ui/Field'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, Loading, EmptyState } from '../../components/ui/States'
import { SubscriptionAPI } from '../../lib/endpoints'
import { formatDate, num } from '../../lib/format'
import './myTrip.css'

/**
 * BoyAccount — the "حساب ولد" action.
 *
 * One boy at a time: what he paid, what is still due, and every payment (date,
 * amount, type) with the servant who recorded it.
 */
export default function BoyAccount({ tripId }) {
  const [boys, setBoys] = useState([])
  const [payments, setPayments] = useState([])
  const [boyId, setBoyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([SubscriptionAPI.getTripSummary(tripId), SubscriptionAPI.getForTrip(tripId)])
      .then(([summary, subs]) => {
        if (cancelled) return
        const list = Array.isArray(summary) ? summary : []
        setBoys(list)
        setPayments(Array.isArray(subs) ? subs : [])
        setBoyId((current) => current || (list.length === 1 ? String(list[0].boy_id) : ''))
        setError(null)
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

  const boy = useMemo(
    () => boys.find((b) => String(b.boy_id) === String(boyId)) || null,
    [boys, boyId],
  )

  const history = useMemo(
    () => (boy ? payments.filter((p) => p.boy_id === boy.boy_id) : []),
    [payments, boy],
  )

  const columns = [
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (p) => formatDate(p.created_at),
    },
    {
      key: 'value',
      label: 'المبلغ',
      align: 'end',
      render: (p) => (
        <span className={p.type === 'recover' ? 'mytrip__amount--due' : 'mytrip__amount'}>
          {num(p.value)} جنيه
        </span>
      ),
    },
    {
      key: 'type',
      label: 'النوع',
      align: 'center',
      width: 110,
      sortValue: (p) => (p.type === 'recover' ? 'استرداد' : 'دفعة'),
      render: (p) => (
        <Badge kind={p.type === 'recover' ? 'red' : 'green'}>
          {p.type === 'recover' ? 'استرداد' : 'دفعة'}
        </Badge>
      ),
    },
    {
      key: 'created_by_name',
      label: 'سجّلها',
      render: (p) => p.created_by_name || <span className="muted xsmall">—</span>,
    },
    {
      key: 'note',
      label: 'ملاحظة',
      width: 260,
      mobile: 'ملاحظة',
      render: (p) =>
        p.note ? <span title={p.note}>{p.note}</span> : <span className="muted xsmall">—</span>,
    },
  ]

  return (
    <div className="mytrip__panel">
      <div className="mytrip__panel-head">
        <div>
          <h3 className="mytrip__panel-title">حساب ولد</h3>
          <p className="mytrip__panel-sub">اختر الولد لعرض المدفوع والباقي وكل الدفعات.</p>
        </div>
      </div>

      {loading ? (
        <Loading label="جارٍ تحميل الحسابات..." />
      ) : error ? (
        <ErrorState error={error} />
      ) : boys.length === 0 ? (
        <EmptyState icon="boys" title="لا يوجد أولاد" message="لا يوجد أولاد مسجلون في فصل هذه الرحلة." />
      ) : (
        <>
          <Field label="اسم الولد" htmlFor="boy-account">
            <Select
              id="boy-account"
              value={boyId}
              onChange={(e) => setBoyId(e.target.value)}
              searchable
              searchPlaceholder="ابحث باسم الولد..."
            >
              <option value="">— اختر الولد —</option>
              {boys.map((b) => (
                <option key={b.boy_id} value={b.boy_id}>
                  {b.boy_name}
                </option>
              ))}
            </Select>
          </Field>

          {!boy ? (
            <EmptyState
              icon="user"
              title="اختر ولدًا"
              message="اختر اسم الولد من القائمة لعرض حسابه."
              inline
            />
          ) : (
            <>
              <div className="mytrip__stats-grid">
                <div className="mytrip__stat-box">
                  <div className="mytrip__stat-value mytrip__stat-value--good">
                    {num(boy.total_paid ?? 0)}
                  </div>
                  <div className="mytrip__stat-label">دفع (جنيه)</div>
                </div>
                <div className="mytrip__stat-box">
                  <div className="mytrip__stat-value mytrip__stat-value--due">
                    {num(Math.max(0, boy.remaining ?? 0))}
                  </div>
                  <div className="mytrip__stat-label">الباقي عليه (جنيه)</div>
                </div>
                <div className="mytrip__stat-box">
                  <div className="mytrip__stat-value">{num(boy.trip_cost)}</div>
                  <div className="mytrip__stat-label">قيمة الاشتراك (جنيه)</div>
                </div>
              </div>

              {history.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="لا توجد دفعات"
                  message="هذا الولد لم يسجل أي دفعة في الرحلة بعد."
                  inline
                />
              ) : (
                <Table
                  columns={columns}
                  rows={history}
                  rowKey={(p) => p.id}
                  stackOnMobile
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
