import { create } from 'zustand'

export type VoiceAgentState = 'idle' | 'recording' | 'processing' | 'speaking'

export interface TranscriptLine {
  id: string
  role: 'bayo' | 'user'
  text: string
}

interface VoiceState {
  panelOpen: boolean
  agentState: VoiceAgentState
  language: 'pidgin' | 'english' | 'yoruba' | 'hausa' | 'igbo'
  transcript: TranscriptLine[]
  openPanel: () => void
  closePanel: () => void
  setAgentState: (state: VoiceAgentState) => void
  setLanguage: (language: VoiceState['language']) => void
  addLine: (line: Omit<TranscriptLine, 'id'>) => void
  clearTranscript: () => void
}

const OPENING: TranscriptLine[] = [
  {
    id: 'b1',
    role: 'bayo',
    text: 'Welcome back Tunde. You get one new job from Funmi for ₦18,500. Phase 2. You wan make I read am for you?',
  },
]

export const useVoiceStore = create<VoiceState>((set) => ({
  panelOpen: false,
  agentState: 'idle',
  language: 'pidgin',
  transcript: OPENING,
  openPanel: () => set({ panelOpen: true, transcript: OPENING, agentState: 'idle' }),
  closePanel: () => set({ panelOpen: false, agentState: 'idle' }),
  setAgentState: (agentState) => set({ agentState }),
  setLanguage: (language) => set({ language }),
  addLine: (line) =>
    set((s) => ({
      transcript: [...s.transcript, { ...line, id: `t-${Date.now()}-${Math.random()}` }],
    })),
  clearTranscript: () => set({ transcript: [] }),
}))
