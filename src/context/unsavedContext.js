import { createContext } from 'react'

/** Shared slot between the provider and `useUnsavedGuard`. */
export const UnsavedChangesContext = createContext(null)
