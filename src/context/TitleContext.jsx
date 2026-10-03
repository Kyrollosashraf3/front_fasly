import { createContext, useContext, useEffect, useState } from 'react'

const TitleContext = createContext({ setTitle: () => {} })

export function TitleProvider({ children }) {
  const [title, setTitle] = useState('')
  return <TitleContext.Provider value={{ title, setTitle }}>{children}</TitleContext.Provider>
}

/**
 * usePageTitle — one call sets both the topbar title and `document.title`.
 *   usePageTitle('الحضور')
 */
export function usePageTitle(title) {
  const { setTitle } = useContext(TitleContext)
  useEffect(() => {
    setTitle(title)
    const prev = document.title
    document.title = title ? `${title} — فصلي` : 'فصلي — إدارة مدارس الأحد'
    return () => {
      document.title = prev
      setTitle('')
    }
  }, [title, setTitle])
}

export function useTopbarTitle() {
  return useContext(TitleContext).title
}
