import { create } from 'zustand'
import type { StewardRole } from '../lib/roles'
import { roleToastMessage } from '../lib/roles'

interface RoleToast {
  message: string
  visible: boolean
}

interface SessionState {
  role: StewardRole
  parishId: string
  demoMode: boolean
  roleToast: RoleToast
  setRole: (role: StewardRole, toastMessage?: string) => void
  syncRole: (role: StewardRole) => void
  setParishId: (id: string) => void
  setDemoMode: (on: boolean) => void
  hideRoleToast: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  role: 'resident',
  parishId: '',
  demoMode: true,
  roleToast: { message: '', visible: false },
  setRole: (role, toastMessage) =>
    set({
      role,
      roleToast: {
        message: toastMessage ?? roleToastMessage(role),
        visible: true,
      },
    }),
  syncRole: (role) => set({ role }),
  setParishId: (parishId) => set({ parishId }),
  setDemoMode: (demoMode) => set({ demoMode }),
  hideRoleToast: () =>
    set((s) => ({ roleToast: { ...s.roleToast, visible: false } })),
}))
