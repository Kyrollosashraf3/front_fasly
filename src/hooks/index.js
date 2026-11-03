import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { classIdFrom } from '../components/layout/navLinks'

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

/**
 * useLastClassId — remembers the last class the user opened in this session.
 *
 * The sidebar and the phone bar keep showing a class's links even on global
 * routes (`/groups`, `/dashboard/...`) that carry no class in the URL, by
 * falling back to the class most recently visited.
 */
export function useLastClassId(currentId) {
  const [last, setLast] = useState(() => {
    try {
      return sessionStorage.getItem('fasly:lastClass') || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    if (!currentId) return
    const value = String(currentId)
    try {
      sessionStorage.setItem('fasly:lastClass', value)
    } catch {
      /* private mode / storage disabled — fall back to in-memory only */
    }
    setLast(value)
  }, [currentId])

  return last
}

/**
 * useClassScope — which class is this module showing?
 *
 * On a class route (`/class/:id/boys`) the URL owns the answer and no picker is
 * offered. On a global route (`/boys`, `/attendance`, …) a super admin gets an
 * in-page picker and may sit on "all classes" (`''`); a single-class login
 * quietly keeps his only class. `classId` is `''` only for the "all" choice.
 * A `?class_id=` in the URL (a notification tapping straight into one class)
 * opens as the picked class.
 */
export function useClassScope() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { classes, classReady } = useAuth()

  // A notification link (`#/followup?class_id=4`) is the class asked for.
  const linkClassId = params.get('class_id') || ''
  const [picked, setPicked] = useState(linkClassId)

  useEffect(() => {
    if (linkClassId) setPicked(linkClassId)
  }, [linkClassId])

  const routeClassId = classIdFrom(pathname)
  const multi = classes.length > 1
  const firstClassId = classReady && classes.length ? String(classes[0].id) : ''

  return {
    routeClassId, // string | null
    isGlobal: !routeClassId,
    multi,
    classes,
    classReady,
    firstClassId,
    picked, // '' == "كل الفصول"
    setPicked,
    classId: routeClassId ?? picked, // '' == "كل الفصول"
  }
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
