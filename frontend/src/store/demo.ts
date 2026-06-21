import { create } from 'zustand'

interface DemoState {
  tourStep: number
  tourActive: boolean
  overrides: Record<string, unknown>
  setTourStep: (step: number) => void
  startTour: () => void
  endTour: () => void
  setOverride: (key: string, value: unknown) => void
  clearOverrides: () => void
}

export const useDemoStore = create<DemoState>((set) => ({
  tourStep: 0,
  tourActive: false,
  overrides: {},
  setTourStep: (tourStep) => set({ tourStep }),
  startTour: () => set({ tourActive: true, tourStep: 0 }),
  endTour: () => set({ tourActive: false, tourStep: 0 }),
  setOverride: (key, value) =>
    set((s) => ({ overrides: { ...s.overrides, [key]: value } })),
  clearOverrides: () => set({ overrides: {} }),
}))
