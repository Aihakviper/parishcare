import { create } from 'zustand'

export type TourAction =
  | null
  | 'open-voice'
  | 'play-voice'
  | 'escalate'
  | 'approve-pastor'
  | 'pulse-chain'

interface TourState {
  active: boolean
  step: number
  paused: boolean
  showFinal: boolean
  pendingAction: TourAction
  chainPulse: boolean
  startTour: () => void
  exitTour: () => void
  completeTour: () => void
  nextStep: () => void
  setStep: (step: number) => void
  setPaused: (paused: boolean) => void
  togglePaused: () => void
  showFinalCard: () => void
  setPendingAction: (action: TourAction) => void
  clearPendingAction: () => void
  setChainPulse: (on: boolean) => void
}

const initial = {
  active: false,
  step: 0,
  paused: false,
  showFinal: false,
  pendingAction: null as TourAction,
  chainPulse: false,
}

export const useTourStore = create<TourState>((set, get) => ({
  ...initial,
  startTour: () =>
    set({
      active: true,
      step: 0,
      paused: false,
      showFinal: false,
      pendingAction: null,
      chainPulse: false,
    }),
  exitTour: () => set({ ...initial }),
  completeTour: () => set({ ...initial }),
  nextStep: () => {
    const { step, showFinal } = get()
    if (showFinal) return
    if (step >= 7) {
      set({ showFinal: true, pendingAction: null, chainPulse: false })
      return
    }
    set({ step: step + 1, pendingAction: null, chainPulse: false })
  },
  setStep: (step) => set({ step, pendingAction: null }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  showFinalCard: () => set({ showFinal: true }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
  clearPendingAction: () => set({ pendingAction: null }),
  setChainPulse: (chainPulse) => set({ chainPulse }),
}))
