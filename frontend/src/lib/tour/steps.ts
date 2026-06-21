import type { StewardRole } from '../roles'
import { HERO_CASE_ID } from '../mock-api'

export interface TourStepDef {
  id: string
  role: StewardRole
  path: string
  /** CSS selector for [data-tour="…"] */
  target: string
  narration: string
  /** Total time on step before auto-advance (ms) */
  durationMs: number
  action?: 'open-voice' | 'play-voice' | 'escalate' | 'approve-pastor' | 'pulse-chain'
  actionDelayMs?: number
}

export const HERO_CASE_PATH = `/officer/case/${HERO_CASE_ID}`

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'officer-queue',
    role: 'officer',
    path: '/officer',
    target: '[data-tour="officer-queue"]',
    narration:
      'Meet the Officer. Sunday morning, RCCG Ikorodu Central. Twelve families need a hand.',
    durationMs: 11_000,
  },
  {
    id: 'ngozi-case',
    role: 'officer',
    path: HERO_CASE_PATH,
    target: '[data-tour="ngozi-history"]',
    narration:
      'Ngozi Okafor, widow with three children. School transport — ₦18,000. Steward sees she was helped 11 days ago at RCCG Yaba.',
    durationMs: 12_000,
  },
  {
    id: 'voice-note',
    role: 'officer',
    path: HERO_CASE_PATH,
    target: '[data-tour="voice-note"]',
    narration:
      "Pastor M.O.'s voice carries Ngozi's story across parishes. The next officer doesn't start from zero.",
    durationMs: 11_000,
    action: 'play-voice',
    actionDelayMs: 1_200,
  },
  {
    id: 'escalation',
    role: 'officer',
    path: HERO_CASE_PATH,
    target: '[data-tour="escalate-bar"]',
    narration:
      "₦18,000 is above the Officer's limit. The officer escalates to the Pastor. The human decides. Always.",
    durationMs: 13_000,
    action: 'escalate',
    actionDelayMs: 3_500,
  },
  {
    id: 'pastor-review',
    role: 'pastor',
    path: '/pastor/approvals',
    target: '[data-tour="pastor-approval"]',
    narration:
      "The Pastor sees the case, the score, the flag, and the officer's note. Steward gives context. The Pastor gives the decision.",
    durationMs: 11_000,
  },
  {
    id: 'pastor-approve',
    role: 'pastor',
    path: '/pastor/approvals',
    target: '[data-tour="pastor-approve-form"]',
    narration:
      'A reason is required. Stewardship that can answer questions later.',
    durationMs: 13_000,
    action: 'approve-pastor',
    actionDelayMs: 3_000,
  },
  {
    id: 'auditor-chain',
    role: 'auditor',
    path: '/auditor',
    target: '[data-tour="auditor-activity"]',
    narration:
      'Every approval, every disbursement, written into a chain no one can quietly edit. Trustees and tithers can verify any record.',
    durationMs: 11_000,
    action: 'pulse-chain',
    actionDelayMs: 800,
  },
  {
    id: 'provincial-patterns',
    role: 'provincial',
    path: '/provincial',
    target: '[data-tour="provincial-patterns"]',
    narration:
      'And at the regional view, the body of Christ recognizes itself. Yaba and Ikorodu, working as one parish.',
    durationMs: 9_000,
  },
]

export const TOUR_TOTAL_MS = TOUR_STEPS.reduce((s, t) => s + t.durationMs, 0)
