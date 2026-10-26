import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { ErrorState, Loading, EmptyState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { SubscriptionAPI, AuthAPI } from '../../lib/endpoints'
import { formatDate, num } from '../../lib/format'
import './myTrip.css'

/**
 * BoyAccount — حساب ولد
 *
 * المستخدم يكتب اسم الولد → تظهر نتيجة (أو أكثر) → يضغط على الاسم →
 * يظهر كارد بسيط بملخص الحساب وتاريخ الدفعات.
 */
export default function BoyAccount({ tripId }) {
  const [boys, setBoys] = useState([])
  const [payments, setPayments] = useState([])
  const [usersMap, setUsersMap] = useState({}) // { id: name }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [boyId, setBoyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      SubscriptionAPI.getTripSummary(tripId),
      SubscriptionAPI.getForTrip(tripId),
      AuthAPI.users().catch(() => []), // لو فشل مش مشكلة
    ])
      .then(([summary, subs, users]) => {
        if (cancelled) return
        const list = Array.isArray(summary) ? summary : []
        setBoys(list.filter((b) => (b.total_paid ?? 0) > 0))
        setPayments(Array.isArray(subs) ? subs : [])
        // بناء map: id → name
        const map = {}
        if (Array.isArray(users)) {
          users.forEach((u) => { map[String(u.id)] = u.name || u.username || u.phone })
        }
        setUsersMap(map)
        setError(null)
      })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tripId])

  // نتائج البحث — تظهر بس لو كتب حاجة
  const results = useMemo(() => {
    const q = search.trim()
    if (!q) return []
    return boys.filter((b) => b.boy_name?.includes(q))
  }, [boys, search])

  const boy = useMemo(
    () => boys.find((b) => b.boy_id === boyId) || null,
    [boys, boyId],
  )

  const history = useMemo(
    () => (boy ? payments.filter((p) => String(p.boy_id) === String(boy.boy_id)) : []),
    [payments, boy],
  )

  const handleSelect = (b) => {
    setBoyId(b.boy_id)
    setSearch(b.boy_name)
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setBoyId(null) // إلغاء الاختيار لو بدأ يكتب تاني
  }

  return (
    <div className="mytrip__panel">
      {loading ? (
        <Loading label="جارٍ تحميل الحسابات..." />
      ) : error ? (
        <ErrorState error={error} />
      ) : boys.length === 0 ? (
        <EmptyState icon="boys" title="لا يوجد أولاد" message="لا يوجد أولاد دفعوا في هذه الرحلة." />
      ) : (
        <>
          {/* حقل البحث */}
          <div className="mytrip__search-wrap">
            <Icon name="search" size={16} />
            <input
              className="mytrip__search-input"
              type="text"
              placeholder="اكتب اسم الولد..."
              value={search}
              onChange={handleSearchChange}
              autoComplete="off"
            />
            {search && (
              <button
                className="mytrip__search-clear"
                onClick={() => { setSearch(''); setBoyId(null) }}
                aria-label="مسح"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>

          {/* نتائج البحث — تظهر فقط قبل الاختيار */}
          {!boyId && results.length > 0 && (
            <div className="mytrip__boys-list">
              {results.map((b) => (
                <button
                  key={b.boy_id}
                  className="mytrip__boy-row"
                  onClick={() => handleSelect(b)}
                >
                  <span className="mytrip__boy-row-name">{b.boy_name}</span>
                  <span className="mytrip__boy-row-summary">
                    <span className="mytrip__summary-label">دفع</span>
                    <strong className="mytrip__summary-amount">{num(b.total_paid ?? 0)} ج</strong>
                    <span className="mytrip__summary-sep" />
                    <span className="mytrip__summary-label">باقي</span>
                    <strong className={`mytrip__summary-amount${(b.remaining ?? 0) > 0 ? ' mytrip__summary-amount--due' : ''}`}>
                      {num(Math.max(0, b.remaining ?? 0))} ج
                    </strong>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* إرشاد أولي */}
          {!boyId && !search && (
            <EmptyState icon="search" title="ابحث عن ولد" message="اكتب اسم الولد في خانة البحث." inline />
          )}

          {/* لا نتائج */}
          {!boyId && search && results.length === 0 && (
            <EmptyState icon="search" title="لا نتائج" message="لا يوجد ولد دفع بهذا الاسم." inline />
          )}

          {/* كارد الولد المختار */}
          {boy && (
            <div className="mytrip__account-card">
              {/* اسم + حالة */}
              <div className="mytrip__account-card-name">
                {boy.boy_name}
                <Badge kind={(boy.remaining ?? 0) <= 0 ? 'green' : 'gold'}>
                  {(boy.remaining ?? 0) <= 0 ? 'مكتمل' : 'جزئي'}
                </Badge>
              </div>

              {/* ملخص دفع / باقي */}
              <div className="mytrip__account-card-amounts">
                <span className="mytrip__pill mytrip__pill--paid">
                  <span className="mytrip__pill-label">دفع</span>
                  <strong className="mytrip__pill-val">{num(boy.total_paid ?? 0)} ج</strong>
                </span>
                <span className="mytrip__pill mytrip__pill--due">
                  <span className="mytrip__pill-label">باقي</span>
                  <strong className="mytrip__pill-val">{num(Math.max(0, boy.remaining ?? 0))} ج</strong>
                </span>
                <span className="mytrip__pill mytrip__pill--neutral">
                  <span className="mytrip__pill-label">الإجمالي</span>
                  <strong className="mytrip__pill-val">{num(boy.trip_cost ?? 0)} ج</strong>
                </span>
              </div>

              {/* تاريخ الدفعات */}
              {history.length === 0 ? (
                <EmptyState icon="inbox" title="لا توجد دفعات" message="لم يسجل هذا الولد أي دفعة بعد." inline />
              ) : (
                <div className="mytrip__history-list">
                  {history.map((p) => (
                    <div key={p.id} className="mytrip__history-item">
                      <div className="mytrip__history-top">
                        <div className="mytrip__history-left">
                          <div className="mytrip__history-date">{formatDate(p.created_at)}</div>
                          <Badge kind={p.type === 'recover' ? 'red' : 'green'}>
                            {p.type === 'recover' ? 'استرداد' : 'دفعة'}
                          </Badge>
                        </div>
                        <div className="mytrip__history-right">
                          <span className={`mytrip__amount${p.type === 'recover' ? ' mytrip__amount--due' : ''}`}>
                            {num(p.value)} ج
                          </span>
                        </div>
                      </div>
                      {p.created_by && (
                        <div className="mytrip__history-note">
                          <Icon name="user" size={12} />
                          <span>{usersMap[String(p.created_by)] ?? p.created_by}</span>
                        </div>
                      )}
                      {p.note && (
                        <div className="mytrip__history-note">
                          <Icon name="note" size={12} />
                          <span>{p.note}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

