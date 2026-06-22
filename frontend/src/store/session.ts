import { create } from 'zustand'
import type { StewardRole } from '../lib/roles'
import { roleToastMessage } from '../lib/roles'

interface RoleToast {
  message: string
  visible: boolean
}

interface SessionState {
  role: StewardRole
  roleToast: RoleToast
  setRole: (role: StewardRole, toastMessage?: string) => void
  syncRole: (role: StewardRole) => void
  hideRoleToast: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  role: 'resident',
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
  hideRoleToast: () =>
    set((s) => ({ roleToast: { ...s.roleToast, visible: false } })),
}))
