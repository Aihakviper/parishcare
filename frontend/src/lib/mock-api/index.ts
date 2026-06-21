import type {
  AuditEntry,
  Beneficiary,
  BeneficiaryLookupResult,
  ChainIntegrityResult,
  Parish,
  SeedBundle,
  VerificationVoucher,
  WelfareCase,
} from '../types/domain'
import { LIMITS } from '../roles'
import { buildSeedBundle } from '../seed'
import {
  computeEntryHash,
  verifyChain,
} from '../seed/audit'
import { parishesInProvince } from '../seed/parishes'
import { getStaffById } from '../seed/staff'

const STORAGE_KEY = 'steward_demo_v1'

function delay(): Promise<void> {
  const ms = 180 + Math.floor(Math.random() * 240)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withLatency<T>(fn: () => T): Promise<T> {
  await delay()
  return fn()
}

function loadState(): SeedBundle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as SeedBundle
    }
  } catch {
    /* fall through */
  }
  const seed = buildSeedBundle()
  saveState(seed)
  return seed
}

function saveState(state: SeedBundle): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

let memoryState: SeedBundle | null = null

function getState(): SeedBundle {
  if (!memoryState) {
    memoryState = loadState()
  }
  return memoryState
}

function setState(next: SeedBundle): void {
  memoryState = next
  saveState(next)
}

function appendAudit(
  state: SeedBundle,
  partial: Omit<AuditEntry, 'entryHash' | 'prevHash'>,
): AuditEntry[] {
  const prevHash =
    state.auditChain.length > 0
      ? state.auditChain[state.auditChain.length - 1].entryHash
      : '0000000000000000000000000000000000000000000000000000000000000000'

  const entryHash = computeEntryHash(prevHash, partial)
  const entry: AuditEntry = { ...partial, prevHash, entryHash }
  return [...state.auditChain, entry]
}

export interface ListCasesFilter {
  parishId?: string
  status?: WelfareCase['status']
  assignedOfficerId?: string
  province?: string
  heroOnly?: boolean
}

export interface CreateCaseInput {
  beneficiaryId: string
  parishId: string
  needCategory: WelfareCase['needCategory']
  amountRequestedKobo: number
  narrative: string
  assignedOfficerId: string
}

export interface DecideCaseInput {
  caseId: string
  decision: 'approve' | 'reject' | 'escalate'
  reason: string
  actorId: string
}

export interface DisbursementInput {
  caseId: string
  payingOfficerId: string
  idempotencyKey: string
}

const idempotencyCache = new Map<string, WelfareCase>()

export const mockApi = {
  async listCases(filter: ListCasesFilter = {}): Promise<WelfareCase[]> {
    return withLatency(() => {
      const state = getState()
      let result = [...state.cases]

      if (filter.parishId) {
        result = result.filter((c) => c.parishId === filter.parishId)
      }
      if (filter.status) {
        result = result.filter((c) => c.status === filter.status)
      }
      if (filter.assignedOfficerId) {
        result = result.filter(
          (c) => c.assignedOfficerId === filter.assignedOfficerId,
        )
      }
      if (filter.province) {
        const parishIds = parishesInProvince(filter.province).map((p) => p.id)
        result = result.filter((c) => parishIds.includes(c.parishId))
      }
      if (filter.heroOnly) {
        result = result.filter((c) => c.isHeroCase)
      }

      return result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    })
  },

  async getCase(caseId: string): Promise<WelfareCase | null> {
    return withLatency(() => {
      const state = getState()
      return state.cases.find((c) => c.id === caseId) ?? null
    })
  },

  async createCase(input: CreateCaseInput): Promise<WelfareCase> {
    return withLatency(() => {
      const state = getState()
      const beneficiary = state.people.find((p) => p.id === input.beneficiaryId)
      if (!beneficiary) throw new Error('Beneficiary not found')

      const now = new Date().toISOString()
      const newCase: WelfareCase = {
        id: `case-${Date.now()}`,
        beneficiaryId: input.beneficiaryId,
        parishId: input.parishId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        priorityScore: 50,
        scoreBreakdown: {
          need_severity: 20,
          urgency: 10,
          dependents: beneficiary.dependents * 2,
          verification_strength: 5,
          recency_penalty: 0,
        },
        riskFlags: beneficiary.disbursementHistory.length === 0
          ? ['new_beneficiary']
          : [],
        amountRequestedKobo: input.amountRequestedKobo,
        assignedOfficerId: input.assignedOfficerId,
        needCategory: input.needCategory,
        narrative: input.narrative,
      }

      const actor = getStaffById(input.assignedOfficerId)
      const auditChain = appendAudit(state, {
        id: `audit-${newCase.id}-open`,
        timestamp: now,
        actorId: input.assignedOfficerId,
        actorName: actor?.name ?? 'Welfare Officer',
        action: 'CASE_OPENED',
        entityType: 'case',
        entityId: newCase.id,
        beforeState: null,
        afterState: { status: 'pending', amountRequestedKobo: input.amountRequestedKobo },
      })

      const next = {
        ...state,
        cases: [newCase, ...state.cases],
        auditChain,
      }
      setState(next)
      return newCase
    })
  },

  async decideCase(input: DecideCaseInput): Promise<WelfareCase> {
    return withLatency(() => {
      const state = getState()
      const idx = state.cases.findIndex((c) => c.id === input.caseId)
      if (idx === -1) throw new Error('Case not found')

      const existing = state.cases[idx]
      const now = new Date().toISOString()
      const actor = getStaffById(input.actorId)

      const updated: WelfareCase = { ...existing, updatedAt: now }

      if (input.decision === 'escalate') {
        updated.status = 'escalated'
      } else if (input.decision === 'approve') {
        updated.status = 'approved'
        updated.decisionReason = input.reason
        updated.approvingOfficerId = input.actorId
      } else {
        updated.status = 'rejected'
        updated.decisionReason = input.reason
        updated.approvingOfficerId = input.actorId
      }

      const action =
        input.decision === 'escalate'
          ? 'ESCALATED_TO_PASTOR'
          : input.decision === 'approve'
            ? 'APPROVED'
            : 'REJECTED'

      const cases = [...state.cases]
      cases[idx] = updated

      const auditChain = appendAudit(state, {
        id: `audit-${updated.id}-${action.toLowerCase()}-${Date.now()}`,
        timestamp: now,
        actorId: input.actorId,
        actorName: actor?.name ?? 'Officer',
        action,
        entityType: 'case',
        entityId: updated.id,
        beforeState: { status: existing.status },
        afterState: { status: updated.status, reason: input.reason },
      })

      setState({ ...state, cases, auditChain })
      return updated
    })
  },

  async executeDisbursement(input: DisbursementInput): Promise<WelfareCase> {
    return withLatency(() => {
      const cached = idempotencyCache.get(input.idempotencyKey)
      if (cached) return cached

      const state = getState()
      const idx = state.cases.findIndex((c) => c.id === input.caseId)
      if (idx === -1) throw new Error('Case not found')

      const existing = state.cases[idx]
      if (existing.status !== 'approved') {
        throw new Error('Case must be approved before disbursement')
      }

      const amount = existing.amountRequestedKobo
      const isOwnApproval = existing.approvingOfficerId === input.payingOfficerId
      if (
        amount > LIMITS.MAKER_CHECKER_THRESHOLD &&
        isOwnApproval
      ) {
        throw new Error('Maker–checker: approver cannot execute payment')
      }

      const now = new Date().toISOString()
      const payer = getStaffById(input.payingOfficerId)

      const updated: WelfareCase = {
        ...existing,
        status: 'disbursed',
        updatedAt: now,
        amountDisbursedKobo: amount,
        payingOfficerId: input.payingOfficerId,
      }

      const cases = [...state.cases]
      cases[idx] = updated

      const auditChain = appendAudit(state, {
        id: `audit-${updated.id}-disbursed-${Date.now()}`,
        timestamp: now,
        actorId: input.payingOfficerId,
        actorName: payer?.name ?? 'Checker',
        action: 'DISBURSED',
        entityType: 'case',
        entityId: updated.id,
        beforeState: { status: 'approved' },
        afterState: {
          status: 'disbursed',
          amountDisbursedKobo: amount,
          idempotencyKey: input.idempotencyKey,
        },
      })

      const parishesUpdated = state.parishes.map((p) =>
        p.id === updated.parishId
          ? {
              ...p,
              currentMonthDisbursedKobo:
                p.currentMonthDisbursedKobo + amount,
            }
          : p,
      )

      setState({
        ...state,
        cases,
        auditChain,
        parishes: parishesUpdated,
      })

      idempotencyCache.set(input.idempotencyKey, updated)
      return updated
    })
  },

  async verifyBeneficiary(phone: string): Promise<BeneficiaryLookupResult> {
    return withLatency(() => {
      const state = getState()
      const normalized = phone.replace(/\D/g, '')
      const match = state.people.find(
        (p) => p.phone.replace(/\D/g, '') === normalized,
      )

      if (!match) {
        return {
          confidentMatch: null,
          possibleMatches: [],
          crossParishHistory: [],
        }
      }

      const similar = state.people
        .filter(
          (p) =>
            p.id !== match.id &&
            p.name.split(' ').pop() === match.name.split(' ').pop(),
        )
        .slice(0, 3)

      return {
        confidentMatch: match,
        possibleMatches: similar,
        crossParishHistory: match.disbursementHistory,
      }
    })
  },

  async requestVouch(caseId: string): Promise<VerificationVoucher> {
    return withLatency(() => {
      const state = getState()
      const welfareCase = state.cases.find((c) => c.id === caseId)
      if (!welfareCase) throw new Error('Case not found')

      const beneficiary = state.people.find(
        (p) => p.id === welfareCase.beneficiaryId,
      )
      const homeParishId = beneficiary?.homeParishId ?? welfareCase.parishId
      const now = new Date()
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const voucher: VerificationVoucher = {
        id: `voucher-${caseId}-${Date.now()}`,
        caseId,
        parishId: homeParishId,
        tokenHash: `vh_${caseId.slice(-8)}_${Date.now().toString(36)}`,
        issuedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      }

      setState({
        ...state,
        vouchers: [...state.vouchers, voucher],
      })

      return voucher
    })
  },

  async getAuditChain(): Promise<AuditEntry[]> {
    return withLatency(() => [...getState().auditChain])
  },

  async verifyChainIntegrity(): Promise<ChainIntegrityResult> {
    return withLatency(() => {
      const chain = getState().auditChain
      const result = verifyChain(chain)
      return {
        valid: result.valid,
        entryCount: chain.length,
        brokenAtId: result.brokenAtId,
        message: result.valid
          ? `Chain intact across ${chain.length} entries.`
          : `Chain broken at entry ${result.brokenAtId}.`,
      }
    })
  },

  async listParishes(province?: string): Promise<Parish[]> {
    return withLatency(() => {
      const state = getState()
      if (province) {
        return state.parishes.filter((p) => p.province === province)
      }
      return [...state.parishes]
    })
  },

  async getBeneficiary(id: string): Promise<Beneficiary | null> {
    return withLatency(() => {
      return getState().people.find((p) => p.id === id) ?? null
    })
  },

  async getProvinceSummary(province: string) {
    return withLatency(() => {
      const state = getState()
      const provinceParishes = state.parishes.filter((p) => p.province === province)
      const parishIds = provinceParishes.map((p) => p.id)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

      const weekCases = state.cases.filter(
        (c) =>
          parishIds.includes(c.parishId) &&
          new Date(c.createdAt).getTime() >= weekAgo,
      )

      const crossParish = weekCases.filter((c) =>
        c.riskFlags.includes('cross_parish_recent'),
      ).length

      return {
        province,
        parishCount: provinceParishes.length,
        totalBudgetKobo: provinceParishes.reduce(
          (s, p) => s + p.monthlyBudgetKobo,
          0,
        ),
        totalDisbursedKobo: provinceParishes.reduce(
          (s, p) => s + p.currentMonthDisbursedKobo,
          0,
        ),
        activeCases: weekCases.length,
        crossParishCoordinations: crossParish,
        heroCaseVisible: weekCases.some((c) => c.isHeroCase),
      }
    })
  },

  resetDemo(): void {
    idempotencyCache.clear()
    const seed = buildSeedBundle()
    setState(seed)
  },
}

/** Restore all seed data and clear idempotency cache. */
export function resetDemo(): void {
  mockApi.resetDemo()
}

export { parishes, people, staff } from '../seed'

export type { WelfareCase, Beneficiary, Parish, AuditEntry } from '../types/domain'
export function getSeedSnapshot(): SeedBundle {
  return structuredClone(buildSeedBundle())
}

export { getBeneficiaryByPhone, HERO_BENEFICIARY_ID } from '../seed/people'
export { HERO_CASE_ID, casesForParish, casesThisWeek } from '../seed/cases'
export { PARISH_IKORODU, PARISH_YABA } from '../seed/parishes'
