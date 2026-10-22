import { HashRouter } from 'react-router-dom'
import { Toasts } from './components/ui/Toasts'
import { AppRoutes } from './router/AppRoutes'

/**
 * App — HashRouter so the build is servable from any static path.
 * The route tree (and its guards) lives in router/AppRoutes.
 */
export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
      <Toasts />
    </HashRouter>
  )
}
