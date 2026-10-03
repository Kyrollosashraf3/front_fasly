import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ModalHost } from '../components/ui/Modal'

const ModalContext = createContext(null)

/**
 * ModalContext — imperative dialogs from anywhere.
 *
 *   const modal = useModal()
 *   if (await modal.confirm({ title: 'حذف الولد؟', message: boy.boy_name }))
 *     await BoyAPI.remove(boy.id)
 *   const note = await modal.note({ value: row.note })
 *
 * Keeps screens free of local `open`/`resolve` boilerplate.
 */
export function ModalProvider({ children }) {
  const [state, setState] = useState(null)
  const resolverRef = useRef(null)

  const close = useCallback((value) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState(null)
  }, [])

  const open = useCallback(
    (config) =>
      new Promise((resolve) => {
        resolverRef.current = resolve
        setState(config)
      }),
    [],
  )

  const confirm = useCallback(
    ({ title = 'هل أنت متأكد؟', message = '', confirmLabel = 'حذف', kind = 'danger' } = {}) =>
      open({ type: 'confirm', title, message, confirmLabel, kind }),
    [open],
  )

  const prompt = useCallback(
    ({ title = 'ملاحظة', value = '', label = 'ملاحظة', rows = 4, maxLength = 500 } = {}) =>
      open({ type: 'prompt', title, value, label, rows, maxLength }),
    [open],
  )

  const value = useMemo(() => ({ open, close, confirm, prompt }), [open, close, confirm, prompt])

  return (
    <ModalContext.Provider value={value}>
      {children}
      {state && <ModalHost config={state} onClose={close} />}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used inside <ModalProvider>')
  return ctx
}
