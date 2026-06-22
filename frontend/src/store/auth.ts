import { create } from 'zustand'
import type { BackendUser } from '../lib/api/backend'
import { backendApi } from '../lib/api/backend'
import { clearTokens, hasAccessToken } from '../lib/api/client'
import { usesBackendApi } from '../lib/api/config'
import type { StewardRole } from '../lib/roles'
import { useSessionStore } from './session'

function frontendRole(role: BackendUser['role']): StewardRole {
  if (role === 'officer') return 'resident'
  if (role === 'pastor') return 'artisan'
  return 'console'
}

function applyUserContext(user: BackendUser): void {
  const session = useSessionStore.getState()
  session.setRole(frontendRole(user.role))
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
  },
}))
