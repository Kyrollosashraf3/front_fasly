import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { TitleProvider } from '../../context/TitleContext'

/** Closes the mobile drawer whenever the route changes. */
function useDrawerSync(open, setOpen) {
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname, setOpen])

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', open)
    return () => document.body.classList.remove('sidebar-open')
  }, [open])
}

/**
 * AppShell — sidebar + topbar + routed content.
 * Rendered once, above the router outlet, so pages only render their own body.
 */
export function AppShell() {
  const [drawer, setDrawer] = useState(false)
  useDrawerSync(drawer, setDrawer)

  return (
    <TitleProvider>
      <div className="shell">
        <Sidebar onClose={() => setDrawer(false)} />
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setDrawer(false)}
        />
        <div className="main-col">
          <Topbar onMenu={() => setDrawer((o) => !o)} />
          <main className="view" id="view">
            <Outlet />
          </main>
        </div>
      </div>
    </TitleProvider>
  )
}
