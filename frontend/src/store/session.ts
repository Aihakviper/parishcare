import { create } from 'zustand'
import type { StewardRole } from '../lib/roles'

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
  setParishId: (id: string) => void
  setDemoMode: (on: boolean) => void
  hideRoleToast: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  role: 'officer',
  parishId: 'parish-ikorodu-central',
  demoMode: true,
  roleToast: { message: '', visible: false },
  setRole: (role, toastMessage) =>
    set((state) => ({
      role,
      roleToast: toastMessage
        ? { message: toastMessage, visible: true }
        : state.roleToast,
    })),
  setParishId: (parishId) => set({ parishId }),
  setDemoMode: (demoMode) => set({ demoMode }),
  hideRoleToast: () =>
    set((s) => ({ roleToast: { ...s.roleToast, visible: false } })),
}))
