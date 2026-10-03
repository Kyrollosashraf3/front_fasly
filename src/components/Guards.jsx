import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './ui/States'

/**
 * RequireAuth — blocks everything until the session is restored, then either
 * renders the routes below it or bounces to /login (remembering where we were
 * headed). Used as a layout route, so it falls back to `<Outlet />`.
 *
 *   <Route element={<RequireAuth />}> ...protected routes... </Route>
 */
export function RequireAuth({ children }) {
  const { ready, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Loading label="جارٍ تحميل الجلسة..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return children ?? <Outlet />
}

/**
 * RoleGuard — declarative per-route permission.
 *
 *   <Route element={<RoleGuard allow={(can, u) => can.seeDashboards(u)} />}>
 *
 * A denied user is sent home instead of a dead 403 page (the API would 403/404
 * anyway — the old UI just showed them the error).
 */
export function RoleGuard({ allow, children }) {
  const { user, can } = useAuth()
  if (!allow(can, user)) return <Navigate to="/" replace />
  return children ?? <Outlet />
}

/**
 * RequireClass — the URL names a class this login may not open (a boy typing
 * another class id, a servant promoted away, ...). Wait for the catalogue,
 * then bounce home exactly like the old router did.
 */
export function RequireClass({ children }) {
  const { classReady, canAccess } = useAuth()
  const { classId } = useParams()

  if (!classReady) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <Loading label="جارٍ تحميل الفصل..." />
      </div>
    )
  }
  if (!canAccess(classId)) return <Navigate to="/" replace />
  return children ?? <Outlet />
}
