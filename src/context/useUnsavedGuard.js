import { useCallback, useContext, useEffect, useId, useRef } from 'react'
import { UnsavedChangesContext } from './unsavedContext'

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
  const id = useId()

  useEffect(() => {
    ref.current.when = when
    ref.current.onSave = onSave
  })

  const readDirty = useCallback(() => {
    const w = ref.current.when
    return typeof w === 'function' ? Boolean(w()) : Boolean(w)
  }, [])

  // Let the provider know, every render, so it can arm the back-button trap.
  useEffect(() => {
    if (!ctx) return
    ctx.reportDirty(id, readDirty())
  })

  useEffect(() => {
    if (!ctx) return undefined
    return ctx.register({
      id,
      isDirty: readDirty,
      onSave: () => ref.current.onSave?.(),
      message,
    })
  }, [ctx, id, message, readDirty])
}
