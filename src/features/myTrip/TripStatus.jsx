import { useEffect, useMemo, useState } from 'react'
import { ErrorState, Loading } from '../../components/ui/States'
import { SubscriptionAPI } from '../../lib/endpoints'
import { num } from '../../lib/format'
import './myTrip.css'

/**
 * TripStatus — the "حالة الرحلة" action.
 *
 * Counts the boys who are on this trip — paid, or only reserved their name with
 * 0 — and compares `count × the trip cost` with what was actually collected so
 * far, as values and as two bars. The class size is extra context, not part of
 * the expected.
 */
export default function TripStatus({ tripId, tripCost, tripName }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const stats = useMemo(() => {
    const boys = rows.length
    const subscribed = rows.filter((r) => r.registered).length
    const collected = rows.reduce((sum, r) => sum + (r.total_paid ?? 0), 0)
    const expected = subscribed * tripCost
    const remaining = Math.max(0, expected - collected)
    const percent = expected > 0 ? Math.round((collected / expected) * 100) : 0
    return { boys, subscribed, collected, expected, remaining, percent }
  }, [rows, tripCost])

  if (loading) return <Loading label="جارٍ حساب حالة الرحلة..." />
  if (error) return <ErrorState error={error} />

  const { boys, subscribed, collected, expected, remaining, percent } = stats
  const barWidth = Math.min(100, Math.max(0, percent))

  return (
    <div className="mytrip__panel">
      <div className="mytrip__stats-grid">
        <div className="mytrip__stat-box">
          <div className="mytrip__stat-value">{subscribed}/{boys}</div>
          <div className="mytrip__stat-label">أولاد مشتركون من الفصل</div>
        </div>
        <div className="mytrip__stat-box">
          <div className="mytrip__stat-value">{num(expected)}</div>
          <div className="mytrip__stat-label">المتوقع من المشتركين (جنيه)</div>
        </div>
        <div className="mytrip__stat-box">
          <div className="mytrip__stat-value mytrip__stat-value--good">{num(collected)}</div>
          <div className="mytrip__stat-label">المحصّل فعليًا (جنيه)</div>
        </div>
        <div className="mytrip__stat-box">
          <div className="mytrip__stat-value mytrip__stat-value--due">{num(remaining)}</div>
          <div className="mytrip__stat-label">الباقي (جنيه)</div>
        </div>
      </div>

      <div className="mytrip__chart">
        <div className="mytrip__bar-row">
          <span className="mytrip__bar-label">المتوقع</span>
          <div className="mytrip__bar-track">
            <div className="mytrip__bar-fill mytrip__bar-fill--expected" style={{ width: '100%' }} />
          </div>
          <span className="mytrip__bar-value">{num(expected)}</span>
        </div>
        <div className="mytrip__bar-row">
          <span className="mytrip__bar-label">المحصّل</span>
          <div className="mytrip__bar-track">
            <div className="mytrip__bar-fill" style={{ width: `${barWidth}%` }} />
          </div>
          <span className="mytrip__bar-value">{num(collected)}</span>
        </div>
      </div>

      <p className="mytrip__caption">
        نسبة التحصيل <strong>{percent}%</strong> من المبلغ المتوقع للمشتركين.
      </p>
    </div>
  )
}
