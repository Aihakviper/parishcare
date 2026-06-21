import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './layout'
import { getRole, type StewardRole } from '../lib/roles'
import { useSessionStore } from '../store/session'
import { OfficerRoutes } from '../surfaces/officer/routes'
import { PastorRoutes } from '../surfaces/pastor/routes'
import { ProvincialRoutes } from '../surfaces/provincial/routes'
import { AuditorRoutes } from '../surfaces/auditor/routes'

function roleFromPath(pathname: string): StewardRole | null {
  if (pathname.startsWith('/officer')) return 'officer'
  if (pathname.startsWith('/pastor')) return 'pastor'
  if (pathname.startsWith('/provincial')) return 'provincial'
  if (pathname.startsWith('/auditor')) return 'auditor'
  return null
}

function RoleSync() {
  const location = useLocation()
  const setRole = useSessionStore((s) => s.setRole)

  useEffect(() => {
    const fromPath = roleFromPath(location.pathname)
    if (!fromPath) return
    const current = useSessionStore.getState().role
    if (fromPath !== current) {
      setRole(fromPath)
    }
  }, [location.pathname, setRole])

  return null
}
export function AppRoutes() {
  return (
    <>
      <RoleSync />
      <Routes>
        <Route path="/" element={<Navigate to="/officer" replace />} />
        <Route element={<AppLayout />}>
          <Route path="officer/*" element={<OfficerRoutes />} />
          <Route path="pastor/*" element={<PastorRoutes />} />
          <Route path="provincial/*" element={<ProvincialRoutes />} />
          <Route path="auditor/*" element={<AuditorRoutes />} />
        </Route>
        <Route path="*" element={<Navigate to="/officer" replace />} />
      </Routes>
    </>
  )
}

export function roleHomePath(role: StewardRole): string {
  return getRole(role).homePath
}
