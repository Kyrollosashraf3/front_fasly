import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useQuery — the app's tiny data layer (no external dependency).
 *
 *   const { data, loading, error, refetch } = useQuery((signal) => BoyAPI.list({...}), [classId])
 *
 * - The fetcher receives an AbortSignal; a new key cancels the previous call.
 * - `refetch()` re-runs with the same key (used after a mutation).
 * - `setData` lets a screen patch the cache locally (optimistic checkbox etc).
 */
export function useQuery(fetcher, deps = [], { enabled = true, initial = null } = {}) {
  const [state, setState] = useState({ data: initial, loading: enabled, error: null })
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)

  // The fetcher is usually an inline closure, so it is refreshed here rather
  // than being a dependency of the effect below (which would loop).
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const key = JSON.stringify(deps)

  useEffect(() => {
    if (!enabled) return undefined
    const ctrl = new AbortController()
    let alive = true

    setState((s) => ({ ...s, loading: true, error: null }))

    Promise.resolve(fetcherRef.current(ctrl.signal))
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if (!alive || err?.name === 'AbortError') return
        setState((s) => ({ data: s.data, loading: false, error: err }))
      })

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [key, nonce, enabled])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  }, [])

  // A disabled query is never "loading", even though its last run said so.
  return { ...state, loading: enabled ? state.loading : false, refetch, setData }
}

/** Value debounced by `wait` ms — search boxes, filter knobs. */
export function useDebounced(value, wait = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), wait)
    return () => clearTimeout(t)
  }, [value, wait])
  return debounced
}

/** Document title per screen: "الحضور — فصلي". */
export function useTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} — فصلي` : 'فصلي — إدارة مدارس الأحد'
    return () => {
      document.title = prev
    }
  }, [title])
}

/** Calls `fn` on click / Escape, ignoring clicks inside `ref` (dropdowns). */
export function useDismiss(ref, fn, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) fn()
    }
    const onKey = (e) => e.key === 'Escape' && fn()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, fn, active])
}
