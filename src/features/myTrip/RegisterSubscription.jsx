import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { BoyAPI, SubscriptionAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { num } from '../../lib/format'
import './myTrip.css'

/**
 * RegisterSubscription — record a payment for a boy of the trip's class.
 *
 * Boys are searched by name (Arabic-aware) and limited to `trip.class_id`, so
 * a servant can never charge a boy from another class. The trip's own cost is
 * shown under the value, and the boy's current balance when one is chosen.
 */
export default function RegisterSubscription({ trip, onSaved, onClose }) {
  const toast = useToast()

  const [boys, setBoys] = useState([])
  const [loadingBoys, setLoadingBoys] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedBoy, setSelectedBoy] = useState(null)
  const [value, setValue] = useState('')
  const [summary, setSummary] = useState(null)
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [type, setType] = useState('charge')
  const [note, setNote] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingBoys(true)
    BoyAPI.list({ class_id: trip.class_id })
      .then((data) => {
        if (!cancelled) setBoys(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setBoys([])
      })
      .finally(() => {
        if (!cancelled) setLoadingBoys(false)
      })
    return () => {
      cancelled = true
    }
  }, [trip.class_id])

  useEffect(() => {
    if (!selectedBoy) {
      setSummary(null)
      return undefined
    }
    let cancelled = false
    SubscriptionAPI.getBoyTripSummary(trip.id, selectedBoy.id)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedBoy, trip.id])

  const matches = useMemo(() => {
    const term = normalizeSearch(query)
    if (!term) return []
    if (selectedBoy && query === selectedBoy.boy_name) return []
    return boys.filter((b) => normalizeSearch(b.boy_name).includes(term)).slice(0, 8)
  }, [boys, query, selectedBoy])

  const remaining = summary?.remaining
  const totalCharged = summary?.total_charged ?? 0
  const overBalance = remaining > 0 && type === 'charge' && Number(value) > remaining
  const overRecover = type === 'recover' && Number(value) > totalCharged

  const selectBoy = (boy) => {
    setSelectedBoy(boy)
    setQuery(boy.boy_name)
  }

  const clearBoy = () => {
    setSelectedBoy(null)
    setValue('')
    setQuery('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!selectedBoy) {
      toast.error('اختر ولدًا من القائمة.')
      return
    }
    const amount = Number(value)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('أدخل قيمة صحيحة أكبر من صفر.')
      return
    }
    setBusy(true)
    try {
      await SubscriptionAPI.create({
        boy_id: selectedBoy.id,
        trip_id: trip.id,
        type,
        value: amount,
        date,
        note: note.trim() || undefined,
      })
      toast.success(`تم تسجيل ${num(amount)} جنيه لـ ${selectedBoy.boy_name}.`)
      onSaved?.()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack mytrip__form" onSubmit={submit} noValidate>
      <Field label="اختر الولد (بالبحث باسمه)" required htmlFor="reg-boy">
        <div className="mytrip__search-wrap">
          <Input
            id="reg-boy"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (selectedBoy && e.target.value !== selectedBoy.boy_name) setSelectedBoy(null)
            }}
            placeholder={loadingBoys ? 'جارٍ تحميل أولاد الفصل...' : 'اكتب اسم الولد...'}
            autoComplete="off"
          />

          {matches.length > 0 && (
            <div className="mytrip__search-list">
              {matches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="mytrip__search-item"
                  onClick={() => selectBoy(b)}
                >
                  {b.boy_name}
                </button>
              ))}
            </div>
          )}

          {!loadingBoys && boys.length === 0 && (
            <span className="field__hint">لا يوجد أولاد مسجلون في فصل هذه الرحلة.</span>
          )}

          {selectedBoy && (
            <div className="mytrip__selected-chip">
              <span>
                مختار: <strong>{selectedBoy.boy_name}</strong>
              </span>
              <button type="button" className="mytrip__chip-remove" onClick={clearBoy} aria-label="مسح الولد">
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
        </div>
      </Field>

      <Field
        label="قيمة الاشتراك (جنيه)"
        required
        htmlFor="reg-value"
        hint={
          remaining !== undefined
            ? type === 'recover'
              ? `يتم خصم المبلغ من المبلغ المستحق للولد.`
              : `دفع ${num(summary?.total_paid ?? 0)} جنيه، والباقي عليه ${num(
                  Math.max(0, remaining),
                )} جنيه.`
            : undefined
        }
      >
        <Input
          id="reg-value"
          type="number"
          min="0"
          step="any"
          dir="ltr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>

      <div className="mytrip__type-toggle">
        <button
          type="button"
          className={`mytrip__type-option${type === 'charge' ? ' is-active' : ''}`}
          onClick={() => setType('charge')}
        >
          دفع
        </button>
        <button
          type="button"
          className={`mytrip__type-option${type === 'recover' ? 'is-active' : ''}`}
          onClick={() => setType('recover')}
        >
          سحب
        </button>
      </div>

      <Field
        label="التاريخ"
        htmlFor="reg-date"
        hint="يتم تعبئة التاريخ تلقائياً بأهوا اليوم إن لم تحدده"
      >
        <Input
          id="reg-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>



      <Field
        label="ملاحظة"
        htmlFor="reg-note"
        hint="قصيرة تصف سبب الدفعة أو الاسترداد (اختياري)"
      >
        <Textarea
          id="reg-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="مثال: استرداد بسبب مغادرة الولد..."
        />
      </Field>

      {overBalance && (
        <div className="mytrip__note mytrip__note--warn">
          <Icon name="info" size={14} />
          <span>المبلغ أكبر من الباقي عليه ({num(remaining)} جنيه).</span>
        </div>
      )}
      {overRecover && (
        <div className="mytrip__note mytrip__note--warn">
          <Icon name="info" size={14} />
          <span>المبلغ أكبر من المدفوع مسبقاً ({num(totalCharged)} جنيه).</span>
        </div>
      )}

      <div className="mytrip__note">
        <Icon name="info" size={14} />
        <span>
          قيمة اشتراك الرحلة: <strong>{num(trip.cost)} جنيه</strong> للولد.
        </span>
      </div>

      <div className="mytrip__form-actions">
        <Button variant="secondary" type="button" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={busy}
          disabled={!selectedBoy || !value || Number(value) <= 0 || overBalance || overRecover}
        >
          {type === 'recover' ? 'سحب الاشتراك' : 'تسجيل الدفعة'}
        </Button>
      </div>
    </form>
  )
}
