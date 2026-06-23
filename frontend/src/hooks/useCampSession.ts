import { usesBackendApi } from '../lib/api/config'
import { campApi } from '../lib/mock-api/camp'
import type { StewardRole } from '../lib/roles'
import { useAuthStore } from '../store/auth'
import { useSessionStore } from '../store/session'
import type { CampUserRole } from '../lib/api/backend'

export interface CampSession {
  userId: string | null
  memberId: string | null
  artisanId: string | null
  parishId: string | null
  stewardRole: StewardRole
  displayName: string
  activeJobId: string | null
  isDemo: boolean
}

const DEMO_HERO = campApi.getHeroIds()

function stewardRoleFromCamp(campRole: CampUserRole | undefined): StewardRole {
  if (campRole === 'artisan') return 'artisan'
  if (campRole === 'pastor' || campRole === 'camp_admin') return 'console'
  return 'resident'
}

/**
 * Resolves which profile ids the current UI should load.
 * - API mode: from `/auth/me` camp fields (real user data).
 * - Mock mode: from role switcher + demo hero ids.
 */
export function useCampSession(): CampSession {
  const user = useAuthStore((s) => s.user)
  const sessionRole = useSessionStore((s) => s.role)
  const sessionParishId = useSessionStore((s) => s.parishId)

  if (usesBackendApi && user) {
    const stewardRole = stewardRoleFromCamp(user.camp_role)
    return {
      userId: user.id,
      memberId: user.member_id ?? null,
      artisanId: user.artisan_id ?? null,
      parishId: user.parish_id ?? null,
      stewardRole,
      displayName: user.name,
      activeJobId: user.active_job_id ?? null,
      isDemo: false,
    }
  }

  if (sessionRole === 'artisan') {
    return {
      userId: null,
      memberId: null,
      artisanId: DEMO_HERO.artisanId,
      parishId: sessionParishId || 'parish-camp-mowe',
      stewardRole: 'artisan',
      displayName: 'Tunde Akinwale',
      activeJobId: DEMO_HERO.jobId,
      isDemo: true,
    }
  }

  if (sessionRole === 'console') {
    return {
      userId: null,
      memberId: null,
      artisanId: null,
      parishId: sessionParishId || 'parish-camp-mowe',
      stewardRole: 'console',
      displayName: 'Pastor Adekunle Olatunde',
      activeJobId: null,
      isDemo: true,
    }
  }

  return {
    userId: null,
    memberId: DEMO_HERO.memberId,
    artisanId: null,
    parishId: sessionParishId || 'parish-camp-phase2',
    stewardRole: 'resident',
    displayName: 'Bisi Oladipo',
    activeJobId: null,
    isDemo: true,
  }
}
