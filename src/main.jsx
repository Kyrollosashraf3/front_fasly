import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ModalProvider } from './context/ModalContext'
import App from './App.jsx'

import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)

/**
 * Offline shell. Registered in production builds only — during `vite dev` the
 * worker would serve a stale index.html and hide the next HMR update.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
