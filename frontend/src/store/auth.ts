import { create } from 'zustand'
import type { BackendUser } from '../lib/api/backend'
import { backendApi } from '../lib/api/backend'
import { clearTokens, hasAccessToken } from '../lib/api/client'
import { usesBackendApi } from '../lib/api/config'
import type { StewardRole } from '../lib/roles'
import { getRole, roleToastMessage } from '../lib/roles'
import { useSessionStore } from './session'

function stewardRoleFromUser(user: BackendUser): StewardRole {
  if (user.camp_role === 'artisan') return 'artisan'
  if (user.camp_role === 'pastor' || user.camp_role === 'camp_admin') return 'console'
  if (user.camp_role === 'member') return 'resident'
  // Legacy welfare roles — map pastor to console, officer to member until camp roles ship
  if (user.role === 'pastor') return 'console'
  if (user.role === 'officer') return 'resident'
  return 'console'
}

function applyUserContext(user: BackendUser): void {
  const session = useSessionStore.getState()
  const stewardRole = stewardRoleFromUser(user)
  session.setRole(stewardRole, roleToastMessage(stewardRole))
  if (user.parish_id) {
    session.setParishId(user.parish_id)
  }
  session.setDemoMode(false)
}

interface AuthState {
  user: BackendUser | null
  loading: boolean
  error: string | null
  restore: () => Promise<void>
  login: (email: string, password: string, mfaCode: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: usesBackendApi,
  error: null,

  restore: async () => {
    if (!usesBackendApi || !hasAccessToken()) {
      set({ loading: false })
      return
    }
    try {
      const user = await backendApi.me()
      applyUserContext(user)
      set({ user, loading: false, error: null })
    } catch (error) {
      clearTokens()
      set({
        user: null,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Cannot connect to ParishCare API',
      })
    }
  },

  login: async (email, password, mfaCode) => {
    set({ loading: true, error: null })
    try {
      await backendApi.login(email, password, mfaCode)
      const user = await backendApi.me()
      applyUserContext(user)
      set({ user, loading: false })
    } catch (error) {
      clearTokens()
      set({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      })
      throw error
    }
  },

  logout: () => {
    clearTokens()
    set({ user: null, error: null })
    const session = useSessionStore.getState()
    session.setDemoMode(true)
    session.setRole('resident', roleToastMessage('resident'))
  },
}))

/** Display name for greetings — API user or demo persona */
export function useAuthDisplayName(): string {
  const user = useAuthStore((s) => s.user)
  if (user) return user.name.split(' ')[0]
  return getRole(useSessionStore.getState().role).persona.split(' ')[0]
}
