import { useEffect } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AppLayout } from './layout'
import type { StewardRole } from '../lib/roles'
import { useSessionStore } from '../store/session'
import { OfficerRoutes } from '../surfaces/officer/routes'
import { PastorRoutes } from '../surfaces/pastor/routes'
import { ProvincialRoutes } from '../surfaces/provincial/routes'
import { AuditorRoutes } from '../surfaces/auditor/routes'
import { usesBackendApi } from '../lib/api/config'
import { getRole } from '../lib/roles'

function roleFromPath(pathname: string): StewardRole | null {
  if (pathname.startsWith('/officer')) return 'officer'
  if (pathname.startsWith('/pastor')) return 'pastor'
  if (pathname.startsWith('/provincial')) return 'provincial'
  if (pathname.startsWith('/auditor')) return 'auditor'
  return null
}

function RoleSync() {
  const location = useLocation()
  const navigate = useNavigate()
  const setRole = useSessionStore((s) => s.setRole)
  const role = useSessionStore((s) => s.role)

  useEffect(() => {
    const fromPath = roleFromPath(location.pathname)
    if (!fromPath) return
    if (usesBackendApi) {
      if (fromPath !== role) {
        navigate(getRole(role).homePath, { replace: true })
      }
      return
    }
    const current = useSessionStore.getState().role
    if (fromPath !== current) {
      setRole(fromPath)
    }
  }, [location.pathname, navigate, role, setRole])

  return null
}
export function AppRoutes() {
  const homePath = getRole(useSessionStore((state) => state.role)).homePath
  return (
    <>
      <RoleSync />
      <Routes>
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route element={<AppLayout />}>
          <Route path="officer/*" element={<OfficerRoutes />} />
          <Route path="pastor/*" element={<PastorRoutes />} />
          <Route path="provincial/*" element={<ProvincialRoutes />} />
          <Route path="auditor/*" element={<AuditorRoutes />} />
        </Route>
        <Route path="*" element={<Navigate to={homePath} replace />} />
      </Routes>
    </>
  )
}
