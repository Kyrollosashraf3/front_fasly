import { useEffect, useMemo, useState } from 'react'
import { Table } from '../../components/ui/Table'
import { ErrorState, Loading, EmptyState } from '../../components/ui/States'
import { SubscriptionAPI, AuthAPI } from '../../lib/endpoints'
import { num } from '../../lib/format'
import './myTrip.css'

const UNKNOWN_ID = '__unknown__'

function paymentDelta(p) {
  const v = Number(p.value) || 0
  return p.type === 'recover' ? -v : v
}

/**
 * ServerAccountStatement — كشف حساب الخدام
 *
 * جدول بكل خادم سجّل دفعات في الرحلة ومجموع ما استلمه (دفعات − استرداد).
 */
export default function ServerAccountStatement({ tripId }) {
  const [payments, setPayments] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      SubscriptionAPI.getForTrip(tripId),
      AuthAPI.users().catch(() => []),
    ])
      .then(([subs, users]) => {
        if (cancelled) return
        setPayments(Array.isArray(subs) ? subs : [])
        const map = {}
        if (Array.isArray(users)) {
          users.forEach((u) => {
            map[String(u.id)] = u.display_name || u.name || u.username || u.phone
          })
        }
        setUsersMap(map)
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

  const rows = useMemo(() => {
    const totals = new Map()
    const names = new Map()
    payments.forEach((p) => {
      const id = p.created_by != null && p.created_by !== '' ? String(p.created_by) : UNKNOWN_ID
      totals.set(id, (totals.get(id) ?? 0) + paymentDelta(p))
      if (p.created_by_name) names.set(id, p.created_by_name)
    })

    return [...totals.entries()]
      .map(([id, total]) => ({
        id,
        name:
          id === UNKNOWN_ID
            ? 'غير معروف'
            : names.get(id) || usersMap[id] || `مستخدم #${id}`,
        total,
      }))
      .filter((r) => r.total !== 0)
      .sort((a, b) => b.total - a.total)
  }, [payments, usersMap])

  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => sum + r.total, 0),
    [rows],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'اسم الخادم',
        mobile: 'الخادم',
        sortValue: (r) => r.name,
        render: (r) => <span className="table__name">{r.name}</span>,
      },
      {
        key: 'total',
        label: 'المبلغ المستلم (ج)',
        align: 'end',
        mobile: 'المستلم',
        sortValue: (r) => r.total,
        render: (r) => (
          <strong className={r.total < 0 ? 'mytrip__amount mytrip__amount--due' : ''}>
            {num(r.total)} ج
          </strong>
        ),
      },
    ],
    [],
  )

  return (
    <div className="mytrip__panel">
      <div className="mytrip__panel-head">
        <div>
          <h3 className="mytrip__panel-title">كشف حساب الخدام</h3>
          <p className="mytrip__panel-sub">
            إجمالي المحصّل عبر الخدام: <strong>{num(grandTotal)} ج</strong>
          </p>
        </div>
      </div>

      {loading ? (
        <Loading label="جارٍ تحميل كشف الحساب..." />
      ) : error ? (
        <ErrorState error={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="لا توجد دفعات"
          message="لم يُسجَّل أي مبلغ في هذه الرحلة بعد."
        />
      ) : (
        <Table
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          compact
          stackOnMobile
          initialSort={{ key: 'total', dir: 'desc' }}
        />
      )}
    </div>
  )
}
