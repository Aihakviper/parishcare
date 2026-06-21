export type NeedCategory =
  | 'school_fees'
  | 'medical'
  | 'food'
  | 'rent'
  | 'burial'
  | 'transport'
  | 'business'

export type StoryTag =
  | 'widowed'
  | 'displaced'
  | 'disabled'
  | 'terminally_ill'
  | 'orphan_guardian'
  | 'elderly'
  | 'unemployed'

export type CaseStatus =
  | 'pending'
  | 'verified'
  | 'escalated'
  | 'approved'
  | 'disbursed'
  | 'rejected'

export type RiskFlag =
  | 'cross_parish_recent'
  | 'amount_high'
  | 'new_beneficiary'

export interface DisbursementHistoryEntry {
  id: string
  parishId: string
  parishName: string
  amountKobo: number
  needCategory: NeedCategory
  daysAgo: number
  recordedAt: string
  voiceNote?: PastoralVoiceNote
}

export interface PastoralVoiceNote {
  durationSeconds: number
  transcript: string
  pastorName: string
}

export interface Beneficiary {
  id: string
  name: string
  phone: string
  dependents: number
  needCategory: NeedCategory
  storyTag: StoryTag
  homeParishId: string
  disbursementHistory: DisbursementHistoryEntry[]
}

export interface Parish {
  id: string
  name: string
  province: string
  pastorName: string
  welfareOfficerName: string
  monthlyBudgetKobo: number
  currentMonthDisbursedKobo: number
  activeCaseCount: number
}

export interface StaffMember {
  id: string
  name: string
  role: 'officer' | 'pastor' | 'checker'
  parishId: string
}

export interface ScoreBreakdown {
  need_severity: number
  urgency: number
  dependents: number
  verification_strength: number
  recency_penalty: number
}

export interface WelfareCase {
  id: string
  beneficiaryId: string
  parishId: string
  status: CaseStatus
  createdAt: string
  updatedAt: string
  priorityScore: number
  scoreBreakdown: ScoreBreakdown
  riskFlags: RiskFlag[]
  decisionReason?: string
  amountRequestedKobo: number
  amountDisbursedKobo?: number
  approvingOfficerId?: string
  payingOfficerId?: string
  assignedOfficerId: string
  pastoralVoiceNote?: PastoralVoiceNote
  needCategory: NeedCategory
  narrative: string
  isHeroCase?: boolean
}

export interface AuditEntry {
  id: string
  timestamp: string
  actorId: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  prevHash: string
  entryHash: string
}

export interface VerificationVoucher {
  id: string
  caseId: string
  parishId: string
  tokenHash: string
  issuedAt: string
  expiresAt: string
  usedAt?: string
  outcome?: 'confirmed' | 'rejected' | 'expired'
}

export interface BeneficiaryLookupResult {
  confidentMatch: Beneficiary | null
  possibleMatches: Beneficiary[]
  crossParishHistory: DisbursementHistoryEntry[]
}

export interface ChainIntegrityResult {
  valid: boolean
  entryCount: number
  brokenAtId?: string
  message: string
}

export interface SeedBundle {
  parishes: Parish[]
  people: Beneficiary[]
  staff: StaffMember[]
  cases: WelfareCase[]
  auditChain: AuditEntry[]
  vouchers: VerificationVoucher[]
}
