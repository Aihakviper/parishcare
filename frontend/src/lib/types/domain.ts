/** Legacy welfare domain types — used by backend API integration layer. */
export type RiskFlag =
  | 'cross_parish_recent'
  | 'amount_high'
  | 'new_beneficiary'

export interface ScoreBreakdown {
  need_severity: number
  urgency: number
  dependents: number
  verification_strength: number
  recency_penalty: number
}

export interface Beneficiary {
  id: string
  name: string
  phone: string
  homeParishId: string
  dependents: number
  needCategory: string
  storyTag: string
  disbursementHistory: unknown[]
}

export interface Parish {
  id: string
  name: string
  province?: string
  pastorName?: string
  welfareOfficerName?: string
  monthlyBudgetKobo?: number
  currentMonthDisbursedKobo?: number
  activeCaseCount?: number
}

export interface WelfareCase {
  id: string
  beneficiaryId: string
  parishId: string
  status: string
  amountRequestedKobo: number
  amountDisbursedKobo?: number
  needCategory: string
  priorityScore: number
  assignedOfficerId: string
  approvingOfficerId?: string
  scoreBreakdown: ScoreBreakdown
  riskFlags: RiskFlag[]
  narrative?: string
  decisionReason?: string
  isHeroCase?: boolean
  createdAt: string
  updatedAt: string
}
