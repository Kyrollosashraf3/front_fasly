import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Modal } from '../components/ui/Modal'

const UnsavedChangesContext = createContext(null)

/**
 * UnsavedChangesProvider — stops the user from silently losing edits.
 *
 * A screen registers a guard through `useUnsavedGuard(when, onSave)`. While the
 * guard reports dirty, any in-app link, the browser back button, a refresh or a
 * tab close is intercepted and the user is asked to save / discard / stay.
 *
 * The router is a HashRouter, so every internal link is an `<a href="#/...">`
 * and the current route lives in `window.location.hash` — the provider can work
 * with plain DOM events and never has to know about the router.
 */
export function UnsavedChangesProvider({ children }) {
  const guardsRef = useRef([])
  const allowNextRef = useRef(false)
  const lastHashRef = useRef(typeof window === 'undefined' ? '' : window.location.hash)
  const [pending, setPending] = useState(null) // { href, message }
  const [saving, setSaving] = useState(false)

  const register = useCallback((guard) => {
    guardsRef.current = [...guardsRef.current, guard]
    return () => {
      guardsRef.current = guardsRef.current.filter((g) => g !== guard)
    }
  }, [])

  /** The most recently registered dirty guard wins (inner form over page). */
  const activeGuard = useCallback(() => {
    for (let i = guardsRef.current.length - 1; i >= 0; i -= 1) {
      try {
        if (guardsRef.current[i].isDirty?.()) return guardsRef.current[i]
      } catch {
        /* a broken guard must never break navigation */
      }
    }
    return null
  }, [])

  const goTo = useCallback((href) => {
    allowNextRef.current = true
    if (window.location.hash === href) {
      allowNextRef.current = false
      return
    }
    window.location.hash = href
  }, [])

  // 1 — internal <a href="#/..."> clicks (capture phase, before React Router).
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const el = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!el || el.target === '_blank') return
      const href = el.getAttribute('href') || ''
      if (!href.startsWith('#') || href.length < 2) return
      if (href === (window.location.hash || '#/')) return
      const guard = activeGuard()
      if (!guard) return
      e.preventDefault()
      e.stopPropagation()
      setPending({ href, message: guard.message })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [activeGuard])

  // 2 — refresh / close tab.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!activeGuard()) return undefined
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [activeGuard])

  // 3 — browser back / forward (hash change that we did not initiate).
  useEffect(() => {
    const onHash = () => {
      const current = window.location.hash
      if (allowNextRef.current) {
        allowNextRef.current = false
        lastHashRef.current = current
        return
      }
      const guard = activeGuard()
      if (!guard) {
        lastHashRef.current = current
        return
      }
      const back = lastHashRef.current
      if (current === back) return
      // Put the route back where it was and ask instead.
      allowNextRef.current = true
      window.location.hash = back
      setPending({ href: current, message: guard.message })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [activeGuard])

  const finish = useCallback(
    (href) => {
      setPending(null)
      if (href) goTo(href)
    },
    [goTo],
  )

  const handleSave = useCallback(async () => {
    const guard = activeGuard()
    if (!guard) {
      finish(pending?.href)
      return
    }
    setSaving(true)
    try {
      const ok = await guard.onSave?.()
      if (ok === false) return
      finish(pending?.href)
    } finally {
      setSaving(false)
    }
  }, [activeGuard, finish, pending])

  const value = useMemo(() => ({ register }), [register])

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(pending)}
        size="sm"
        title="فيه تعديلات لم تُحفظ"
        onClose={() => !saving && setPending(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setPending(null)}
            >
              رجوع
            </button>
            <button
              type="button"
              className="btn-link btn-link--danger"
              disabled={saving}
              onClick={() => finish(pending?.href)}
            >
              تجاهل
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
            </button>
          </>
        }
      >
        <p className="muted">
          {pending?.message || 'لسه فيه تعديلات لم تُحفظ. تحب تحفظها قبل ما تسيب الصفحة؟'}
        </p>
      </Modal>
    </UnsavedChangesContext.Provider>
  )
}

/**
 * Register this screen as guarding unsaved work.
 *
 *   useUnsavedGuard(dirty, () => save())        // dirty is a boolean
 *   useUnsavedGuard(() => dirty, () => save())  // or a function
 *
 * `onSave` should resolve `true` (saved, continue) or `false` (failed, stay).
 */
export function useUnsavedGuard(when, onSave, message) {
  const ctx = useContext(UnsavedChangesContext)
  // Latest closure kept in a ref so the guard registered once always calls
  // the current `when` / `onSave` without re-registering on every render.
  const ref = useRef({ when, onSave })

  useEffect(() => {
    ref.current.when = when
    ref.current.onSave = onSave
  })

  useEffect(() => {
    if (!ctx) return undefined
    return ctx.register({
      isDirty: () => {
        const w = ref.current.when
        return typeof w === 'function' ? Boolean(w()) : Boolean(w)
      },
      onSave: () => ref.current.onSave?.(),
      message,
    })
  }, [ctx, message])
}
