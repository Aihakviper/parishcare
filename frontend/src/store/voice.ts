import { create } from 'zustand'

export type VoiceAgentState = 'idle' | 'recording' | 'processing' | 'speaking'

interface VoiceState {
  panelOpen: boolean
  agentState: VoiceAgentState
  language: 'pidgin' | 'english' | 'yoruba' | 'hausa' | 'igbo'
  openPanel: () => void
  closePanel: () => void
  setAgentState: (state: VoiceAgentState) => void
  setLanguage: (language: VoiceState['language']) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  panelOpen: false,
  agentState: 'idle',
  language: 'pidgin',
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false, agentState: 'idle' }),
  setAgentState: (agentState) => set({ agentState }),
  setLanguage: (language) => set({ language }),
}))
