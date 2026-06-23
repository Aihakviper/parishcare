import type {
  Beneficiary,
  Parish,
  RiskFlag,
  ScoreBreakdown,
  WelfareCase,
} from '../types/domain'
import { apiRequest, loginRequest } from './client'

export interface BackendUser {
  id: string
  name: string
  email: string
  role: 'officer' | 'pastor' | 'hq' | 'auditor'
  parish_id: string | null
  mfa_enabled: boolean
  is_active: boolean
  /** Camp Smart City profile — see BACKEND_CAMP_API.md */
  camp_role?: CampUserRole
  member_id?: string | null
  artisan_id?: string | null
  active_job_id?: string | null
}

export type CampUserRole = 'member' | 'artisan' | 'pastor' | 'camp_admin'

interface BackendBeneficiary {
  id: string
  name: string
  phone: string
  home_parish_id: string
  dependents_count: number
  verification_status: 'unverified' | 'pending' | 'verified'
}

interface BackendParish {
  id: string
  name: string
  region: string
  contact_name: string
}

interface BackendWelfareRequest {
  id: string
  beneficiary_id: string
  created_by: string
  request_type: 'school' | 'medical' | 'food' | 'loan' | 'widow' | 'rent'
  amount_requested_kobo: number
  reason: string
  status: 'pending' | 'verified' | 'approved' | 'paid' | 'rejected'
  priority_score: number
  score_breakdown: {
    factors?: Partial<ScoreBreakdown>
  } & Partial<ScoreBreakdown>
  risk_flags: Array<{ code?: string }>
  decision_reason: string | null
  decided_by: string | null
  created_at: string
  updated_at: string
}

interface BackendDisbursement {
  rail_reference: string
  amount_kobo: number
}

interface VerificationStart {
  voucher_token: string | null
}

const needCategoryMap = {
  school: 'school_fees',
  medical: 'medical',
  food: 'food',
  loan: 'business',
  widow: 'food',
  rent: 'rent',
} as const

function mapRiskFlags(flags: BackendWelfareRequest['risk_flags']): RiskFlag[] {
  const mapped = flags.map((flag) => {
    if (flag.code === 'recent_support') return 'cross_parish_recent'
    if (flag.code === 'high_amount') return 'amount_high'
    return 'new_beneficiary'
  })
  return [...new Set(mapped)]
}

function mapScoreBreakdown(
  source: BackendWelfareRequest['score_breakdown'],
): ScoreBreakdown {
  const factors = source.factors ?? source
  return {
    need_severity: factors.need_severity ?? 0,
    urgency: factors.urgency ?? 0,
    dependents: factors.dependents ?? 0,
    verification_strength: factors.verification_strength ?? 0,
    recency_penalty: factors.recency_penalty ?? 0,
  }
}

function mapCase(
  request: BackendWelfareRequest,
  parishId: string,
): WelfareCase {
  return {
    id: request.id,
    beneficiaryId: request.beneficiary_id,
    parishId,
    status: request.status === 'paid' ? 'disbursed' : request.status,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    priorityScore: request.priority_score,
    scoreBreakdown: mapScoreBreakdown(request.score_breakdown),
    riskFlags: mapRiskFlags(request.risk_flags),
    decisionReason: request.decision_reason ?? undefined,
    amountRequestedKobo: request.amount_requested_kobo,
    amountDisbursedKobo:
      request.status === 'paid' ? request.amount_requested_kobo : undefined,
    approvingOfficerId: request.decided_by ?? undefined,
    assignedOfficerId: request.created_by,
    needCategory: needCategoryMap[request.request_type],
    narrative: request.reason,
  }
}

function mapBeneficiary(source: BackendBeneficiary): Beneficiary {
  return {
    id: source.id,
    name: source.name,
    phone: source.phone,
    dependents: source.dependents_count,
    needCategory: 'medical',
    storyTag: 'unemployed',
    homeParishId: source.home_parish_id,
    disbursementHistory: [],
  }
}

function mapParish(source: BackendParish): Parish {
  return {
    id: source.id,
    name: source.name,
    province: source.region,
    pastorName: source.contact_name,
    welfareOfficerName: source.contact_name,
    monthlyBudgetKobo: 0,
    currentMonthDisbursedKobo: 0,
    activeCaseCount: 0,
  }
}

async function getBackendBeneficiary(id: string): Promise<BackendBeneficiary> {
  return apiRequest<BackendBeneficiary>(`/beneficiaries/${id}`)
}

export const backendApi = {
  login: loginRequest,

  me(): Promise<BackendUser> {
    return apiRequest<BackendUser>('/auth/me')
  },

  async listCases(): Promise<WelfareCase[]> {
    const requests = await apiRequest<BackendWelfareRequest[]>(
      '/welfare-requests',
    )
    return Promise.all(
      requests.map(async (request) => {
        const beneficiary = await getBackendBeneficiary(request.beneficiary_id)
        return mapCase(request, beneficiary.home_parish_id)
      }),
    )
  },

  async getCase(caseId: string): Promise<WelfareCase | null> {
    const request = await apiRequest<BackendWelfareRequest>(
      `/welfare-requests/${caseId}`,
    )
    const beneficiary = await getBackendBeneficiary(request.beneficiary_id)
    return mapCase(request, beneficiary.home_parish_id)
  },

  async getBeneficiary(id: string): Promise<Beneficiary | null> {
    return mapBeneficiary(await getBackendBeneficiary(id))
  },

  async getParish(id: string): Promise<Parish> {
    return mapParish(await apiRequest<BackendParish>(`/parishes/${id}`))
  },

  async decideCase(input: {
    caseId: string
    decision: 'approve' | 'reject' | 'escalate'
    reason: string
  }): Promise<WelfareCase> {
    if (input.decision === 'escalate') {
      throw new Error(
        'Sign in as the parish pastor to approve requests above the officer limit.',
      )
    }
    const status = input.decision === 'approve' ? 'approved' : 'rejected'
    await apiRequest(`/welfare-requests/${input.caseId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ status, reason: input.reason }),
    })
    return (await this.getCase(input.caseId)) as WelfareCase
  },

  async requestVouch(caseId: string): Promise<void> {
    const start = await apiRequest<VerificationStart>(
      `/welfare-requests/${caseId}/verify`,
      { method: 'POST' },
    )
    if (start.voucher_token) {
      await apiRequest('/verification-vouchers/respond', {
        method: 'POST',
        body: JSON.stringify({
          token: start.voucher_token,
          outcome: 'confirmed',
        }),
      })
    }
  },

  async executeDisbursement(input: {
    caseId: string
    idempotencyKey: string
    amountKobo: number
  }): Promise<BackendDisbursement> {
    return apiRequest<BackendDisbursement>('/disbursements', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        welfare_request_id: input.caseId,
        amount_kobo: input.amountKobo,
      }),
    })
  },
}
