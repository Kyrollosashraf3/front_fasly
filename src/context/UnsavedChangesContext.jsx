import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UnsavedGuardDialog } from './UnsavedGuardDialog'
import { UnsavedChangesContext } from './unsavedContext'

export { useUnsavedGuard } from './useUnsavedGuard'

/**
 * UnsavedChangesProvider — stops the user from silently losing edits.
 *
 * A screen registers a guard through `useUnsavedGuard(when, onSave)`. While the
 * guard reports dirty, any in-app link, the browser back button (including the
 * phone's swipe-back / hardware key), a refresh or a tab close is intercepted
 * and the user is asked to save / discard / stay.
 *
 * The router is a HashRouter, so every internal link is an `<a href="#/...">`
 * and the current route lives in `window.location.hash` — the provider can work
 * with plain DOM events and never has to know about the router.
 *
 * The hard part is the back button. The router logs that change through the
 * `popstate` event and re-renders *before* our `hashchange` listener runs, so by
 * then the page (and its guard) would already be gone. Instead, while a guard is
 * dirty we keep a duplicate history entry on top: the first back press only pops
 * that duplicate, which carries the very same URL, so the router sees no change
 * and the page keeps its state — and we get to ask.
 */
export function UnsavedChangesProvider({ children }) {
  const guardsRef = useRef([])
  const dirtyMapRef = useRef(new Map())
  const allowNextRef = useRef(false)
  // While a leave is in flight (back / discard), ignore the events it causes.
  const suppressRef = useRef(0)
  const sentinelHashRef = useRef(null)
  const lastHashRef = useRef(typeof window === 'undefined' ? '' : window.location.hash)
  const [pending, setPending] = useState(null) // { href } | { back: true }
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const register = useCallback((guard) => {
    guardsRef.current = [...guardsRef.current, guard]
    return () => {
      guardsRef.current = guardsRef.current.filter((g) => g !== guard)
      dirtyMapRef.current.delete(guard.id)
      setDirty(dirtyMapRef.current.size > 0)
    }
  }, [])

  /** Guards tell us whether they are dirty, so the provider can react. */
  const reportDirty = useCallback((id, value) => {
    const map = dirtyMapRef.current
    if (value) map.set(id, true)
    else map.delete(id)
    setDirty((was) => (map.size > 0) === was ? was : map.size > 0)
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

  // 1 — in-app link clicks.
  useEffect(() => {
    const onClick = (e) => {
      const guard = activeGuard()
      if (!guard) return
      if (e.defaultPrevented) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = e.target.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href') || ''
      if (!href.startsWith('#') || href === window.location.hash) return
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

  // 3 — a programmatic hash change we did not start (backup for case 1).
  useEffect(() => {
    const onHash = () => {
      const current = window.location.hash
      if (Date.now() < suppressRef.current) {
        lastHashRef.current = current
        return
      }
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
      allowNextRef.current = true
      window.location.hash = back
      setPending({ href: current, message: guard.message })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [activeGuard])

  // 4 — while dirty, keep a duplicate history entry on top so the browser back
  //     button (and the phone's swipe-back) lands on the same URL: the router
  //     sees no route change, the page keeps its state, and we get to ask.
  useEffect(() => {
    if (!dirty) return undefined

    const arm = () => {
      const state = window.history.state
      window.history.pushState(
        state ? { ...state, unsaved: true } : { unsaved: true },
        '',
        window.location.href,
      )
      sentinelHashRef.current = window.location.hash
    }
    arm()

    const onPop = () => {
      if (Date.now() < suppressRef.current) return
      const guard = activeGuard()
      if (!guard) {
        lastHashRef.current = window.location.hash
        return
      }
      arm()
      setPending({ back: true, message: guard.message })
    }

    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      // Step off our duplicate entry so the next back needs only one press.
      if (window.history.state?.unsaved && window.location.hash === sentinelHashRef.current) {
        sentinelHashRef.current = null
        suppressRef.current = Date.now() + 400
        window.history.back()
      } else {
        sentinelHashRef.current = null
      }
    }
  }, [dirty, activeGuard])

  const finish = useCallback(() => {
    const target = pending
    setPending(null)
    if (!target) return
    if (target.back) {
      // We are sitting on the duplicate entry; skip it *and* the real one.
      suppressRef.current = Date.now() + 800
      allowNextRef.current = true
      window.history.go(-2)
    } else if (target.href) {
      goTo(target.href)
    }
  }, [pending, goTo])

  const handleSave = useCallback(async () => {
    const guard = activeGuard()
    if (!guard) {
      finish()
      return
    }
    setSaving(true)
    try {
      const ok = await guard.onSave?.()
      if (ok === false) return
      finish()
    } finally {
      setSaving(false)
    }
  }, [activeGuard, finish])

  const value = useMemo(() => ({ register, reportDirty }), [register, reportDirty])

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <UnsavedGuardDialog
        pending={pending}
        saving={saving}
        onStay={() => setPending(null)}
        onDiscard={finish}
        onSave={handleSave}
      />
    </UnsavedChangesContext.Provider>
  )
}
