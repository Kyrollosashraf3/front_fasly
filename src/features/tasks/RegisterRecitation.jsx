import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { BoyAPI, TaskValueAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { formatShort, todayISO } from '../../lib/format'
import './tasks.css'

/**
 * RegisterRecitation — mark that a boy of the task's class recited it.
 *
 * Boys are searched by name (Arabic-aware) and limited to `task.class_id`, and
 * a boy who already recited this task is shown but not selectable — the server
 * keeps one row per (task, boy). The طايو is read from the task itself, and
 * "استلم الطايو" stays off until he is actually handed it.
 */
export default function RegisterRecitation({ task, onSaved, onClose }) {
  const toast = useToast()

  const [boys, setBoys] = useState([])
  // boy_id -> the date he recited *this* task, so the block reads as this
  // competition's own record and never as "he recited somewhere else".
  const [recitedDates, setRecitedDates] = useState(() => new Map())
  const [loadingBoys, setLoadingBoys] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedBoy, setSelectedBoy] = useState(null)
  const [date, setDate] = useState(todayISO)
  const [received, setReceived] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingBoys(true)
    Promise.all([
      BoyAPI.list({ class_id: task.class_id }),
      TaskValueAPI.list({ task_id: task.id }),
    ])
      .then(([boysData, valuesData]) => {
        if (cancelled) return
        setBoys(Array.isArray(boysData) ? boysData : [])
        setRecitedDates(
          new Map(
            (Array.isArray(valuesData) ? valuesData : []).map((v) => [v.boy_id, v.action_date]),
          ),
        )
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
  }, [task.class_id, task.id])

  const matches = useMemo(() => {
    const term = normalizeSearch(query)
    if (!term) return []
    if (selectedBoy && query === selectedBoy.boy_name) return []
    return boys.filter((b) => normalizeSearch(b.boy_name).includes(term)).slice(0, 8)
  }, [boys, query, selectedBoy])

  const selectBoy = (boy) => {
    if (recitedDates.has(boy.id)) return
    setSelectedBoy(boy)
    setQuery(boy.boy_name)
  }

  const clearBoy = () => {
    setSelectedBoy(null)
    setQuery('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!selectedBoy) {
      toast.error('اختر ولدًا من القائمة.')
      return
    }
    setBusy(true)
    try {
      await TaskValueAPI.create({
        task_id: task.id,
        boy_id: selectedBoy.id,
        action_date: date || undefined,
        received,
      })
      toast.success(
        received
          ? `تم تسجيل تسميع ${selectedBoy.boy_name} واستلامه ${task.value} طايو.`
          : `تم تسجيل تسميع ${selectedBoy.boy_name} — الطايو لسه مستحقاته.`,
      )
      onSaved?.()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack tasks__form" onSubmit={submit} noValidate>
      <Field label="اختر الولد (بالبحث باسمه)" required htmlFor="rec-boy">
        <div className="tasks__search-wrap">
          <Input
            id="rec-boy"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (selectedBoy && e.target.value !== selectedBoy.boy_name) setSelectedBoy(null)
            }}
            placeholder={loadingBoys ? 'جارٍ تحميل أولاد الفصل...' : 'اكتب اسم الولد...'}
            autoComplete="off"
          />

          {matches.length > 0 && (
            <div className="tasks__search-list">
              {matches.map((b) => {
                const recitedOn = recitedDates.get(b.id)
                return (
                  <button
                    key={b.id}
                    type="button"
                    className="tasks__search-item"
                    disabled={recitedOn !== undefined}
                    onClick={() => selectBoy(b)}
                  >
                    <span>{b.boy_name}</span>
                    {recitedOn !== undefined && (
                      <span className="tasks__search-done">
                        سمّع هنا من قبل — {formatShort(recitedOn)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {!loadingBoys && boys.length === 0 && (
            <span className="field__hint">لا يوجد أولاد مسجلون في فصل هذه المسابقة.</span>
          )}

          {selectedBoy && (
            <div className="tasks__selected-chip">
              <span>
                مختار: <strong>{selectedBoy.boy_name}</strong>
              </span>
              <button
                type="button"
                className="tasks__chip-remove"
                onClick={clearBoy}
                aria-label="مسح الولد"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
        </div>
      </Field>

      <Field label="تاريخ التسميع" htmlFor="rec-date">
        <Input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <div className="tasks__receive">
        <Checkbox
          label="استلم الطايو الآن"
          checked={received}
          onChange={(e) => setReceived(e.target.checked)}
        />
      </div>

      <div className="tasks__note">
        <Icon name="info" size={14} />
        <span>
          مكافأة التسميع في هذه المسابقة: <strong>{task.value} طايو</strong>.
        </span>
      </div>

      <div className="tasks__form-actions">
        <Button variant="secondary" type="button" onClick={onClose}>
          إلغاء
        </Button>
        <Button variant="primary" type="submit" loading={busy} disabled={!selectedBoy}>
          تسجيل التسميع
        </Button>
      </div>
    </form>
  )
}
