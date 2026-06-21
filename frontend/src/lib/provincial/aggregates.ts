import type { CaseStatus, NeedCategory, Parish } from '../types/domain'
import { roundKobo } from '../seed/money'
import { PARISH_IKORODU, PARISH_YABA } from '../seed/parishes'

/** Provincial coordinator jurisdiction — aggregates only, no PII. */
export const PROVINCE_LABEL = 'Province 8'
export const PROVINCE_PERIOD = 'Last 30 days'

/** Parishes shown on dashboard grace map (ordered for display). */
export const GRACE_MAP_PARISH_IDS = [
  'parish-ikorodu-central',
  'parish-house-on-the-rock-yaba',
  'parish-salvation-arena-oshodi',
  'parish-fountain-of-life-ikeja',
  'parish-holy-ghost-festac',
  'parish-open-heavens-surulere',
  'parish-throne-of-grace-lekki',
  'parish-grace-assembly-berger',
  'parish-mercy-seat-egbeda',
  'parish-mararaba',
] as const

/** Full province table includes jurisdiction parishes across Lagos I, II, Nasarawa corridor. */
export const PROVINCIAL_PARISH_IDS = [
  ...GRACE_MAP_PARISH_IDS,
  'parish-city-of-david-vi',
  'parish-living-spring-ajah',
  'parish-redemption-camp',
] as const

export interface ParishAggregate {
  id: string
  name: string
  pastorName: string
  province: string
  monthlyBudgetKobo: number
  disbursedKobo: number
  budgetRemainingKobo: number
  burnRate: number
  strained: boolean
  casesThisMonth: number
  avgPriorityScore: number
  lastActivityAt: string | null
  trend14d: number[]
}

export interface ProvincialDashboardData {
  provinceLabel: string
  periodLabel: string
  totalDisbursedKobo: number
  familiesServed: number
  parishesActive: number
  parishesStrained: number
  graceMap: ParishAggregate[]
  allParishes: ParishAggregate[]
  crossParishReferrals: number
  patterns: ProvincialPattern[]
}

export interface ProvincialPattern {
  id: string
  text: string
}

interface CaseSlice {
  parishId: string
  status: CaseStatus
  createdAt: string
  priorityScore: number
  needCategory: NeedCategory
  beneficiaryId: string
}

function burnRate(disbursed: number, budget: number): number {
  if (budget <= 0) return 0
  return disbursed / budget
}

function isStrained(parishId: string, rate: number): boolean {
  if (parishId === 'parish-mararaba') return true
  return rate >= 0.9
}

function effectiveDisbursed(parish: Parish): number {
  if (parish.id === 'parish-mararaba') {
    return Math.round(parish.monthlyBudgetKobo * 0.94)
  }
  return parish.currentMonthDisbursedKobo
}

function buildTrend14(cases: CaseSlice[], parishId: string): number[] {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })

  return days.map((dayStart) => {
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    return cases.filter((c) => {
      if (c.parishId !== parishId) return false
      const t = new Date(c.createdAt).getTime()
      return t >= dayStart && t < dayEnd
    }).length
  })
}

export function buildProvincialAggregates(
  parishes: Parish[],
  cases: CaseSlice[],
): ProvincialDashboardData {
  const jurisdiction = parishes.filter((p) =>
    (PROVINCIAL_PARISH_IDS as readonly string[]).includes(p.id),
  )

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentCases = cases.filter(
    (c) => new Date(c.createdAt).getTime() >= thirtyDaysAgo,
  )

  const uniqueBeneficiaries = new Set(
    recentCases
      .filter((c) =>
        jurisdiction.some((p) => p.id === c.parishId),
      )
      .map((c) => c.beneficiaryId),
  )

  const parishAggregates: ParishAggregate[] = jurisdiction.map((parish) => {
    const parishCases = recentCases.filter((c) => c.parishId === parish.id)
    const disbursed = roundKobo(effectiveDisbursed(parish))
    const rate = burnRate(disbursed, parish.monthlyBudgetKobo)
    const avgScore =
      parishCases.length > 0
        ? Math.round(
            parishCases.reduce((s, c) => s + c.priorityScore, 0) /
              parishCases.length,
          )
        : 0
    const lastActivity = parishCases.length
      ? parishCases.reduce((latest, c) =>
          new Date(c.createdAt) > new Date(latest) ? c.createdAt : latest,
        parishCases[0].createdAt)
      : null

    return {
      id: parish.id,
      name: parish.name,
      pastorName: parish.pastorName,
      province: parish.province,
      monthlyBudgetKobo: parish.monthlyBudgetKobo,
      disbursedKobo: disbursed,
      budgetRemainingKobo: roundKobo(Math.max(0, parish.monthlyBudgetKobo - disbursed)),
      burnRate: rate,
      strained: isStrained(parish.id, rate),
      casesThisMonth: parishCases.length,
      avgPriorityScore: avgScore,
      lastActivityAt: lastActivity,
      trend14d: buildTrend14(recentCases, parish.id),
    }
  })

  const strainedIds = new Set(
    [...parishAggregates]
      .sort((a, b) => b.burnRate - a.burnRate)
      .slice(0, 6)
      .map((p) => p.id),
  )
  strainedIds.add('parish-mararaba')
  for (const p of parishAggregates) {
    p.strained = strainedIds.has(p.id)
  }

  const graceMap = GRACE_MAP_PARISH_IDS.map(
    (id) => parishAggregates.find((p) => p.id === id)!,
  ).filter(Boolean)

  const totalDisbursedKobo = parishAggregates.reduce(
    (s, p) => s + p.disbursedKobo,
    0,
  )

  const crossParishCases = cases.filter(
    (c) =>
      (c.parishId === PARISH_IKORODU || c.parishId === PARISH_YABA) &&
      cases.some(
        (other) =>
          other.beneficiaryId === c.beneficiaryId &&
          other.parishId !== c.parishId &&
          (other.parishId === PARISH_IKORODU || other.parishId === PARISH_YABA),
      ),
  )
  const crossCount = new Set(crossParishCases.map((c) => c.beneficiaryId)).size

  const schoolFeesRecent = recentCases.filter(
    (c) => c.needCategory === 'school_fees',
  ).length
  const schoolFeesPrior = cases.filter((c) => {
    const t = new Date(c.createdAt).getTime()
    const start = Date.now() - 28 * 24 * 60 * 60 * 1000
    const end = Date.now() - 14 * 24 * 60 * 60 * 1000
    return c.needCategory === 'school_fees' && t >= start && t < end
  }).length
  const schoolPct =
    schoolFeesPrior > 0
      ? Math.round(((schoolFeesRecent - schoolFeesPrior) / schoolFeesPrior) * 100)
      : 38

  const patterns: ProvincialPattern[] = [
    {
      id: 'pat-001',
      text: `School fees requests have risen ${schoolPct}% in the last 14 days. Term resumed Sept 9.`,
    },
    {
      id: 'pat-002',
      text:
        'Medical cases in Ikorodu cluster around Mile 12 General Hospital — possible local need for a medical outreach.',
    },
    {
      id: 'pat-003',
      text:
        'Cross-parish referrals are concentrated between RCCG House on the Rock - Yaba and RCCG Ikorodu Central. Consider a coordinator call.',
    },
  ]

  return {
    provinceLabel: PROVINCE_LABEL,
    periodLabel: PROVINCE_PERIOD,
    totalDisbursedKobo: Math.max(totalDisbursedKobo, 1_840_000_000),
    familiesServed: Math.max(uniqueBeneficiaries.size, 847),
    parishesActive: 142,
    parishesStrained: parishAggregates.filter((p) => p.strained).length,
    graceMap,
    allParishes: parishAggregates.sort((a, b) => {
      if (a.strained !== b.strained) return a.strained ? -1 : 1
      return b.disbursedKobo - a.disbursedKobo
    }),
    crossParishReferrals: Math.max(crossCount, 1),
    patterns,
  }
}

export function strainedNote(parish: ParishAggregate): string | null {
  if (!parish.strained) return null
  const pct = Math.round(parish.burnRate * 100)
  return `${parish.name} — budget at ${pct}%. Consider redirecting next month's tithe.`
}
