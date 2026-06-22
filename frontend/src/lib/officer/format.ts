import { formatDistanceToNow } from 'date-fns'
import type { CaseStatus, NeedCategory, RiskFlag, StoryTag } from '../types/domain'
import { formatNaira } from '../formatters'

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]

export function countToHeadingWord(n: number): string {
  if (n < 20) {
    const word = ONES[n] ?? String(n)
    return word.charAt(0).toUpperCase() + word.slice(1)
  }
  return String(n)
}

export function redactPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) {
    const local = digits.startsWith('234') ? digits.slice(3) : digits
    const prefix = local.slice(0, 3)
    const suffix = local.slice(-4)
    return `+234 ${prefix} ••• ${suffix}`
  }
  return phone
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function needCategoryLabel(cat: NeedCategory): string {
  const labels: Record<NeedCategory, string> = {
    school_fees: 'School fees',
    medical: 'Medical',
    food: 'Food aid',
    rent: 'Rent',
    burial: 'Burial',
    transport: 'Transport',
    business: 'Business',
  }
  return labels[cat]
}

export function storyTagLine(tag: StoryTag, dependents: number): string {
  const label = tag.replace(/_/g, ' ')
  return `${label} · ${dependents} dependent${dependents === 1 ? '' : 's'}`
}

export type PriorityBand = 'high' | 'medium' | 'low'

export function priorityBand(score: number): PriorityBand {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function statusLabel(status: CaseStatus): string {
  const labels: Record<CaseStatus, string> = {
    pending: 'Pending',
    verified: 'Verified',
    escalated: 'Escalated',
    approved: 'Approved',
    disbursed: 'Disbursed',
    rejected: 'Declined',
  }
  return labels[status]
}

export function riskFlagMessage(
  flag: RiskFlag,
  context?: { parishName?: string; daysAgo?: number },
): string {
  switch (flag) {
    case 'cross_parish_recent':
      return context?.parishName && context?.daysAgo != null
        ? `Helped by ${context.parishName} ${context.daysAgo} days ago — review continuity`
        : 'Recent care at another parish — review continuity'
    case 'amount_high':
      return 'Amount is high for this need category'
    case 'new_beneficiary':
      return 'New to the network — home parish vouch recommended'
    default:
      return flag
  }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatRequestLine(kobo: number, category: NeedCategory): string {
  return `${formatNaira(kobo)} for ${needCategoryLabel(category).toLowerCase()}`
}

export function truncateHash(hash: string): string {
  if (hash.length < 12) return hash
  return `0x${hash.slice(0, 4)}…${hash.slice(-4)}`
}
