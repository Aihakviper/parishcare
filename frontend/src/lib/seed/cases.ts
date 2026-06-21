import type {
  CaseStatus,
  NeedCategory,
  RiskFlag,
  ScoreBreakdown,
  WelfareCase,
} from '../types/domain'
import { HERO_BENEFICIARY_ID, people } from './people'
import { parishes, PARISH_IKORODU } from './parishes'
import { createPrng, intBetween, pick } from './prng'

const STATUSES: CaseStatus[] = [
  'pending',
  'verified',
  'escalated',
  'approved',
  'disbursed',
  'rejected',
]

const STATUS_WEIGHTS = [0.14, 0.14, 0.1, 0.1, 0.42, 0.1]

const NARRATIVES: Record<NeedCategory, string[]> = {
  school_fees: [
    'Second term fees at community grammar school; father is out of work.',
    'WAEC registration for two children; widow selling akara at bus stop.',
    'Private school balance after partial payment from relatives.',
  ],
  medical: [
    'Dialysis sessions at LUTH; NHIS does not cover full cost.',
    'Appendectomy for daughter; discharge bill outstanding.',
    'Hypertension medication for elderly mother under her care.',
  ],
  food: [
    'Household staples for Ramadan period; five children at home.',
    'Dry season hardship; farm yield failed in home village.',
    'Food support after fire destroyed market stall.',
  ],
  rent: [
    'Two months arrears; landlord issued quit notice.',
    'Room rent in face-me-I-face-me; income from tailoring stopped.',
    'Annual rent due; primary earner lost job in December.',
  ],
  burial: [
    'Burial support for mother; contributions from family fell short.',
    'Funeral expenses for husband; children still in primary school.',
  ],
  transport: [
    'Daily school transport for three children after relocation to Ikorodu.',
    'Transport to chemotherapy appointments in Lagos Island.',
    'Okada accident left beneficiary unable to walk to work.',
  ],
  business: [
    'Restock provisions shop after flood damaged inventory.',
    'Purchase sewing machine to resume tailoring income.',
    'Small grant to restart pepper grinding trade.',
  ],
}

const DECISION_APPROVE = [
  'Genuine need confirmed at home parish. Prior support was one-time.',
  'Pastor recommends approval; beneficiary known to welfare unit.',
  'Medical referral verified. Amount within parish guidelines.',
  'School fees deadline confirmed with bursar letter.',
]

const DECISION_REJECT = [
  'Documentation incomplete; asked to return with parish referral.',
  'Duplicate request within 14-day window at same parish.',
  'Amount exceeds need verified by home cell leader.',
  'Beneficiary declined follow-up visit from welfare team.',
]

const MAKER_CHECKER_THRESHOLD_KOBO = 5_000_000

function weightedStatus(rng: () => number): CaseStatus {
  const roll = rng()
  let cumulative = 0
  for (let i = 0; i < STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i]
    if (roll <= cumulative) return STATUSES[i]
  }
  return 'pending'
}

function randomCreatedAt(rng: () => number): string {
  const useRecent = rng() < 0.55
  const daysAgo = useRecent ? intBetween(rng, 0, 6) : intBetween(rng, 7, 29)
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(intBetween(rng, 7, 18), intBetween(rng, 0, 59), 0, 0)
  return d.toISOString()
}

function buildScore(rng: () => number, beneficiary: (typeof people)[0]): {
  breakdown: ScoreBreakdown
  total: number
} {
  const need_severity = intBetween(rng, 8, 40)
  const urgency = intBetween(rng, 0, 25)
  const dependents = Math.min(15, beneficiary.dependents * 3)
  const verification_strength = intBetween(rng, 0, 10)
  const recency_penalty =
    beneficiary.disbursementHistory.length > 0
      ? -intBetween(rng, 2, 20)
      : 0

  const breakdown: ScoreBreakdown = {
    need_severity,
    urgency,
    dependents,
    verification_strength,
    recency_penalty,
  }

  const total = Math.max(
    0,
    Math.min(
      100,
      need_severity + urgency + dependents + verification_strength + recency_penalty,
    ),
  )

  return { breakdown, total }
}

function buildRiskFlags(
  rng: () => number,
  beneficiary: (typeof people)[0],
  amountKobo: number,
  parishId: string,
): RiskFlag[] {
  const flags: RiskFlag[] = []

  const recentElsewhere = beneficiary.disbursementHistory.some(
    (h) => h.parishId !== parishId && h.daysAgo <= 21,
  )
  if (recentElsewhere) flags.push('cross_parish_recent')
  if (amountKobo >= 8_000_000) flags.push('amount_high')
  if (beneficiary.disbursementHistory.length === 0 && rng() < 0.35) {
    flags.push('new_beneficiary')
  }

  return flags
}

function buildHeroCase(): WelfareCase {
  const now = new Date()
  now.setHours(9, 14, 0, 0)

  return {
    id: 'case-hero-ngozi-001',
    beneficiaryId: HERO_BENEFICIARY_ID,
    parishId: PARISH_IKORODU,
    status: 'verified',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    priorityScore: 78,
    scoreBreakdown: {
      need_severity: 32,
      urgency: 16,
      dependents: 12,
      verification_strength: 18,
      recency_penalty: 0,
    },
    riskFlags: ['cross_parish_recent'],
    amountRequestedKobo: 1_800_000,
    assignedOfficerId: 'officer-parish-ikorodu-central',
    needCategory: 'transport',
    narrative:
      'School transport for three children — eldest in SS2 at Ikorodu Grammar School. Relocated from Yaba after husband\'s passing.',
    isHeroCase: true,
    pastoralVoiceNote: {
      durationSeconds: 42,
      pastorName: 'Pastor M.O.',
      transcript:
        'Sister Ngozi lost her husband to a road accident in March. Three children, eldest in SS2. Genuine. Praying.',
    },
  }
}

function generateCases(count: number): WelfareCase[] {
  const rng = createPrng(2026)
  const pool = people.filter((p) => p.id !== HERO_BENEFICIARY_ID)
  const cases: WelfareCase[] = []

  const parishSlots: string[] = parishes.flatMap((p) =>
    Array.from({ length: Math.max(1, p.activeCaseCount) }, () => p.id),
  )

  while (parishSlots.length < count) {
    parishSlots.push(pick(rng, parishes).id)
  }

  for (let i = 0; i < count; i++) {
    const beneficiary = pick(rng, pool)
    const parishId = parishSlots[i % parishSlots.length]
    const needCategory = beneficiary.needCategory
    const status = weightedStatus(rng)
    const amountRequestedKobo = intBetween(rng, 3_000_00, 120_000_00)
    const { breakdown, total } = buildScore(rng, beneficiary)
    const createdAt = randomCreatedAt(rng)
    const riskFlags = buildRiskFlags(rng, beneficiary, amountRequestedKobo, parishId)

    const assignedOfficerId = `officer-${parishId}`
    const caseId = `case-${String(i + 1).padStart(4, '0')}`

    const welfareCase: WelfareCase = {
      id: caseId,
      beneficiaryId: beneficiary.id,
      parishId,
      status,
      createdAt,
      updatedAt: createdAt,
      priorityScore: total,
      scoreBreakdown: breakdown,
      riskFlags,
      amountRequestedKobo,
      assignedOfficerId,
      needCategory,
      narrative: pick(rng, NARRATIVES[needCategory]),
    }

    if (status === 'approved' || status === 'disbursed') {
      welfareCase.decisionReason = pick(rng, DECISION_APPROVE)
      welfareCase.approvingOfficerId =
        amountRequestedKobo > 1_500_000
          ? `pastor-${parishId}`
          : assignedOfficerId
    }

    if (status === 'rejected') {
      welfareCase.decisionReason = pick(rng, DECISION_REJECT)
      welfareCase.approvingOfficerId = `pastor-${parishId}`
    }

    if (status === 'disbursed') {
      welfareCase.amountDisbursedKobo = amountRequestedKobo
      const approver = welfareCase.approvingOfficerId!
      const needsChecker = amountRequestedKobo > MAKER_CHECKER_THRESHOLD_KOBO
      if (needsChecker) {
        welfareCase.payingOfficerId = `checker-${parishId}`
        if (welfareCase.payingOfficerId === approver) {
          welfareCase.payingOfficerId = assignedOfficerId
        }
      } else {
        welfareCase.payingOfficerId =
          approver === assignedOfficerId
            ? `checker-${parishId}`
            : assignedOfficerId
      }
    }

    if (status === 'escalated') {
      welfareCase.decisionReason = undefined
    }

    if (rng() < 0.08) {
      welfareCase.pastoralVoiceNote = {
        durationSeconds: intBetween(rng, 28, 95),
        pastorName: parishes.find((p) => p.id === parishId)!.pastorName,
        transcript:
          'Member of good standing. Welfare team has visited the home. Recommend care.',
      }
    }

    cases.push(welfareCase)
  }

  return cases
}

/** 79 generated cases plus the Ngozi hero case (80 total). */
export const cases: WelfareCase[] = [buildHeroCase(), ...generateCases(79)]

export const HERO_CASE_ID = 'case-hero-ngozi-001'

export function getCaseById(id: string): WelfareCase | undefined {
  return cases.find((c) => c.id === id)
}

export function casesForParish(parishId: string): WelfareCase[] {
  return cases.filter((c) => c.parishId === parishId)
}

export function casesThisWeek(): WelfareCase[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return cases.filter((c) => new Date(c.createdAt).getTime() >= weekAgo)
}
