import { formatDistanceToNow, format } from 'date-fns'
import type { AuditEntry, Parish } from '../types/domain'
import { getStaffById } from '../seed/staff'
import { formatNaira } from '../formatters'

export type AuditEntryType =
  | 'disbursement'
  | 'approval'
  | 'voucher'
  | 'verification'
  | 'intake'
  | 'escalation'
  | 'rejection'
  | 'other'

export interface AuditDisplayEntry {
  id: string
  entryHash: string
  prevHash: string
  hashShort: string
  entryType: AuditEntryType
  detail: string
  timestamp: string
  timeAgo: string
  verified: boolean
  action: string
  signerRole: string
  parishName: string | null
  redactedPayload: Record<string, unknown>
  nextHash: string | null
}

const PII_KEYS = new Set([
  'beneficiary',
  'name',
  'phone',
  'reason',
  'pastor',
  'actorName',
])

function hashShort(hash: string): string {
  if (hash.length < 12) return hash
  return `0x${hash.slice(0, 4)}…${hash.slice(-4)}`
}

function actionToType(action: string): AuditEntryType {
  switch (action) {
    case 'DISBURSED':
      return 'disbursement'
    case 'APPROVED':
      return 'approval'
    case 'CROSS_PARISH_LOOKUP':
    case 'VOICE_NOTE_REVIEWED':
      return 'voucher'
    case 'VERIFIED':
      return 'verification'
    case 'CASE_OPENED':
      return 'intake'
    case 'ESCALATED_TO_PASTOR':
      return 'escalation'
    case 'REJECTED':
      return 'rejection'
    default:
      return 'other'
  }
}

function roleFromActorId(actorId: string): string {
  if (actorId.startsWith('pastor-')) return 'Parish Pastor'
  if (actorId.startsWith('checker-')) return 'Welfare Checker'
  if (actorId.startsWith('officer-')) return 'Welfare Officer'
  return 'System'
}

function redactState(
  state: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!state) return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (PII_KEYS.has(key)) {
      if (key === 'beneficiary') out[key] = '[redacted]'
      else if (key === 'phone') out[key] = '+234 ••• ••••'
      else out[key] = '[redacted]'
      continue
    }
    if (key === 'amountDisbursedKobo' || key === 'amountRequestedKobo') {
      out[key] = value
      out.amountDisplay = formatNaira(Number(value))
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        typeof v === 'string' && v.includes('RCCG') ? v : '[redacted]',
      )
    } else {
      out[key] = value
    }
  }
  return out
}

function parishFromCase(
  entityId: string,
  parishByCase: Map<string, string>,
  parishes: Parish[],
): string | null {
  const parishId = parishByCase.get(entityId)
  if (!parishId) return null
  return parishes.find((p) => p.id === parishId)?.name ?? null
}

function buildDetail(
  entry: AuditEntry,
  type: AuditEntryType,
  parishName: string | null,
): string {
  const after = entry.afterState ?? {}
  switch (type) {
    case 'disbursement': {
      const kobo = Number(after.amountDisbursedKobo ?? 0)
      const parish = parishName?.replace(/^RCCG\s*/, 'RCCG ') ?? 'Parish'
      return `${formatNaira(kobo)}   ${parish}`
    }
    case 'approval':
      return roleFromActorId(entry.actorId)
    case 'voucher':
      return '+234 ••• 4412'
    case 'verification':
      return parishName?.replace(/^RCCG\s*/, '') ?? 'Home parish'
    case 'intake': {
      const kobo = Number(after.amountRequestedKobo ?? 0)
      return kobo ? formatNaira(kobo) : 'New request'
    }
    case 'escalation':
      return 'Pastor review'
    case 'rejection':
      return 'Case closed'
    default:
      return entry.action.replace(/_/g, ' ').toLowerCase()
  }
}

export function presentAuditEntry(
  entry: AuditEntry,
  index: number,
  chain: AuditEntry[],
  parishByCase: Map<string, string>,
  parishes: Parish[],
): AuditDisplayEntry {
  const type = actionToType(entry.action)
  const parishName = parishFromCase(entry.entityId, parishByCase, parishes)
  const staff = getStaffById(entry.actorId)

  return {
    id: entry.id,
    entryHash: entry.entryHash,
    prevHash: entry.prevHash,
    hashShort: hashShort(entry.entryHash),
    entryType: type,
    detail: buildDetail(entry, type, parishName),
    timestamp: entry.timestamp,
    timeAgo: formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true }),
    verified: true,
    action: entry.action,
    signerRole: staff?.role
      ? staff.role === 'pastor'
        ? 'Parish Pastor'
        : staff.role === 'checker'
          ? 'Welfare Checker'
          : 'Welfare Officer'
      : roleFromActorId(entry.actorId),
    parishName,
    redactedPayload: {
      before: redactState(entry.beforeState),
      after: redactState(entry.afterState),
      entityType: entry.entityType,
      entityId: entry.entityId,
    },
    nextHash: chain[index + 1]?.entryHash ?? null,
  }
}

export function presentAuditChain(
  chain: AuditEntry[],
  parishByCase: Map<string, string>,
  parishes: Parish[],
): AuditDisplayEntry[] {
  return chain.map((entry, i) =>
    presentAuditEntry(entry, i, chain, parishByCase, parishes),
  )
}

export function formatAuditDate(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy')
}

export function formatAuditDateTime(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy · HH:mm')
}

export const VERIFY_SNIPPET = `// Independent verification (SHA-256 chain)
const canonical = JSON.stringify({
  id, timestamp, actorId, action,
  entityType, entityId,
  beforeState, afterState, prevHash
});
const entryHash = sha256(prevHash + canonical);
// entryHash must match ledger record`
