import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ResidentLayout } from './layout-resident'
import { ArtisanLayout } from './layout-artisan'
import { ConsoleLayout } from './layout-console'
import { MarketingLanding } from '../surfaces/marketing/Landing'
import { ResidentHome } from '../surfaces/resident/Home'
import { ResidentDiscover } from '../surfaces/resident/Discover'
import { ResidentArtisanProfile } from '../surfaces/resident/ArtisanProfile'
import { ResidentBookJob } from '../surfaces/resident/BookJob'
import { ResidentMyJobs } from '../surfaces/resident/MyJobs'
import { ResidentJobTracking } from '../surfaces/resident/JobTracking'
import { ResidentJobPay } from '../surfaces/resident/JobPay'
import { ResidentJobReview } from '../surfaces/resident/JobReview'
import { ResidentProfile } from '../surfaces/resident/Profile'
import { ArtisanHome } from '../surfaces/artisan/Home'
import { ArtisanActiveJob } from '../surfaces/artisan/ActiveJob'
import { ArtisanEarnings } from '../surfaces/artisan/Earnings'
import { ArtisanStanding } from '../surfaces/artisan/Standing'
import { ArtisanProfile } from '../surfaces/artisan/Profile'
import { ArtisanApprenticeship } from '../surfaces/artisan/Apprenticeship'
import { ArtisanMentorEnroll } from '../surfaces/artisan/MentorEnroll'
import { ConsoleOverview } from '../surfaces/console/Overview'
import { ConsoleArtisans } from '../surfaces/console/ArtisansRegistry'
import { ConsoleArtisanDetail } from '../surfaces/console/ArtisanDetail'
import { ConsoleJobs } from '../surfaces/console/Jobs'
import { ConsoleDisputes } from '../surfaces/console/Disputes'
import { ConsoleDisputeDetail } from '../surfaces/console/DisputeDetail'
import { ConsolePatterns } from '../surfaces/console/Patterns'
import { ConsoleHands } from '../surfaces/console/HandsQueue'
import { ConsoleStanding } from '../surfaces/console/StandingQueue'
import { ConsoleLineage } from '../surfaces/console/LineageView'
import { WhatsAppVouch } from '../surfaces/whatsapp/WhatsAppVouch'
import { useSessionStore } from '../store/session'
import type { StewardRole } from '../lib/roles'

function roleFromPath(pathname: string): StewardRole | null {
  if (pathname.startsWith('/member') || pathname.startsWith('/resident')) return 'resident'
  if (pathname.startsWith('/artisan')) return 'artisan'
  if (pathname.startsWith('/console')) return 'console'
  return null
}

function RedirectResident() {
  const { pathname } = useLocation()
  const target = pathname.replace(/^\/resident/, '/member')
  return <Navigate to={target} replace />
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

export function AppRoutes() {
  return (
    <>
      <RoleSync />
      <Routes>
        <Route path="/" element={<Navigate to="/marketing" replace />} />
        <Route path="/marketing" element={<MarketingLanding />} />
        <Route path="/whatsapp" element={<WhatsAppVouch />} />

        <Route path="/resident/*" element={<RedirectResident />} />

        <Route element={<ResidentLayout />}>
          <Route path="member" element={<ResidentHome />} />
          <Route path="member/discover" element={<ResidentDiscover />} />
          <Route path="member/artisan/:id" element={<ResidentArtisanProfile />} />
          <Route path="member/book/:artisanId" element={<ResidentBookJob />} />
          <Route path="member/jobs" element={<ResidentMyJobs />} />
          <Route path="member/jobs/:id" element={<ResidentJobTracking />} />
          <Route path="member/jobs/:id/pay" element={<ResidentJobPay />} />
          <Route path="member/jobs/:id/review" element={<ResidentJobReview />} />
          <Route path="member/me" element={<ResidentProfile />} />
        </Route>

        <Route element={<ArtisanLayout />}>
          <Route path="artisan" element={<ArtisanHome />} />
          <Route path="artisan/jobs/:id" element={<ArtisanActiveJob />} />
          <Route path="artisan/earnings" element={<ArtisanEarnings />} />
          <Route path="artisan/standing" element={<ArtisanStanding />} />
          <Route path="artisan/profile" element={<ArtisanProfile />} />
          <Route path="artisan/apprenticeship" element={<ArtisanApprenticeship />} />
          <Route path="artisan/mentor" element={<ArtisanMentorEnroll />} />
        </Route>

        <Route element={<ConsoleLayout />}>
          <Route path="console" element={<ConsoleOverview />} />
          <Route path="console/artisans" element={<ConsoleArtisans />} />
          <Route path="console/artisans/:id" element={<ConsoleArtisanDetail />} />
          <Route path="console/jobs" element={<ConsoleJobs />} />
          <Route path="console/disputes" element={<ConsoleDisputes />} />
          <Route path="console/disputes/:id" element={<ConsoleDisputeDetail />} />
          <Route path="console/patterns" element={<ConsolePatterns />} />
          <Route path="console/hands" element={<ConsoleHands />} />
          <Route path="console/standing" element={<ConsoleStanding />} />
          <Route path="console/lineage" element={<ConsoleLineage />} />
        </Route>

        <Route path="*" element={<Navigate to="/marketing" replace />} />
      </Routes>
    </>
  )
}
