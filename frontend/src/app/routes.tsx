import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ResidentLayout } from './layout-resident'
import { ArtisanLayout } from './layout-artisan'
import { ConsoleLayout } from './layout-console'
import { MarketingLanding } from '../surfaces/marketing/Landing'
import { ResidentHome } from '../surfaces/resident/Home'
import { ArtisanHome } from '../surfaces/artisan/Home'
import { ConsoleOverview } from '../surfaces/console/Overview'
import { useSessionStore } from '../store/session'
import type { StewardRole } from '../lib/roles'

function roleFromPath(pathname: string): StewardRole | null {
  if (pathname.startsWith('/resident')) return 'resident'
  if (pathname.startsWith('/artisan')) return 'artisan'
  if (pathname.startsWith('/console')) return 'console'
  return null
}

function RoleSync() {
  const location = useLocation()
  const syncRole = useSessionStore((s) => s.syncRole)

  useEffect(() => {
    const fromPath = roleFromPath(location.pathname)
    if (!fromPath) return
    if (fromPath !== useSessionStore.getState().role) {
      syncRole(fromPath)
    }
  }, [location.pathname, syncRole])

  return null
}

function Placeholder({ title }: { title: string }) {
  return (
    <p className="italic-serif text-slate py-12 text-center">
      {title} — coming in the next prompt.
    </p>
  )
}

export function AppRoutes() {
  return (
    <>
      <RoleSync />
      <Routes>
        <Route path="/" element={<Navigate to="/marketing" replace />} />
        <Route path="/marketing" element={<MarketingLanding />} />

        <Route element={<ResidentLayout />}>
          <Route path="resident" element={<ResidentHome />} />
          <Route path="resident/discover" element={<Placeholder title="Discover" />} />
          <Route path="resident/jobs" element={<Placeholder title="My jobs" />} />
          <Route path="resident/me" element={<Placeholder title="Profile" />} />
        </Route>

        <Route element={<ArtisanLayout />}>
          <Route path="artisan" element={<ArtisanHome />} />
          <Route path="artisan/jobs/:id" element={<Placeholder title="Active job" />} />
          <Route path="artisan/earnings" element={<Placeholder title="Earnings" />} />
          <Route path="artisan/standing" element={<Placeholder title="Standing" />} />
          <Route path="artisan/profile" element={<Placeholder title="Profile" />} />
        </Route>

        <Route element={<ConsoleLayout />}>
          <Route path="console" element={<ConsoleOverview />} />
          <Route path="console/artisans" element={<Placeholder title="Artisan registry" />} />
          <Route path="console/jobs" element={<Placeholder title="All jobs" />} />
          <Route path="console/disputes" element={<Placeholder title="Disputes" />} />
          <Route path="console/patterns" element={<Placeholder title="Patterns" />} />
        </Route>

        <Route path="*" element={<Navigate to="/marketing" replace />} />
      </Routes>
    </>
  )
}
