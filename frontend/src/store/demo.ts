import { create } from 'zustand'

interface DemoState {
  active: boolean
  step: number
  paused: boolean
  completed: boolean
  startTour: () => void
  nextStep: () => void
  togglePaused: () => void
  finishTour: () => void
}

export const useDemoStore = create<DemoState>((set) => ({
  active: false,
  step: 0,
  paused: false,
  completed: false,
  startTour: () => set({ active: true, step: 0, paused: false, completed: false }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  finishTour: () => set({ active: false, completed: true }),
}))
