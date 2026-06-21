import type { AuditEntry, WelfareCase } from '../types/domain'
import { people } from './people'
import { staff } from './staff'

const GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000'

function canonical(entry: Omit<AuditEntry, 'entryHash'>): string {
  return JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    prevHash: entry.prevHash,
  })
}

function hashString(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const part1 = (h >>> 0).toString(16).padStart(8, '0')
  const part2 = Math.imul(h ^ input.length, 2654435761)
    .toString(16)
    .padStart(8, '0')
  return (part1 + part2).repeat(4).slice(0, 64)
}

export function computeEntryHash(
  prevHash: string,
  payload: Omit<AuditEntry, 'entryHash' | 'prevHash'>,
): string {
  return hashString(prevHash + canonical({ ...payload, prevHash }))
}

export function buildAuditChainFromCases(caseList: WelfareCase[]): AuditEntry[] {
  const entries: AuditEntry[] = []
  let prevHash = GENESIS_HASH

  const push = (
    partial: Omit<AuditEntry, 'entryHash' | 'prevHash'>,
  ) => {
    const entryHash = computeEntryHash(prevHash, partial)
    const entry: AuditEntry = { ...partial, prevHash, entryHash }
    entries.push(entry)
    prevHash = entryHash
  }

  for (const welfareCase of caseList) {
    const beneficiary = people.find((p) => p.id === welfareCase.beneficiaryId)
    const officer = staff.find((s) => s.id === welfareCase.assignedOfficerId)

    push({
      id: `audit-${welfareCase.id}-open`,
      timestamp: welfareCase.createdAt,
      actorId: welfareCase.assignedOfficerId,
      actorName: officer?.name ?? 'Welfare Officer',
      action: 'CASE_OPENED',
      entityType: 'case',
      entityId: welfareCase.id,
      beforeState: null,
      afterState: {
        status: 'pending',
        beneficiary: beneficiary?.name,
        amountRequestedKobo: welfareCase.amountRequestedKobo,
      },
    })

    if (
      welfareCase.status !== 'pending' &&
      welfareCase.riskFlags.includes('cross_parish_recent')
    ) {
      push({
        id: `audit-${welfareCase.id}-lookup`,
        timestamp: new Date(
          new Date(welfareCase.createdAt).getTime() + 120_000,
        ).toISOString(),
        actorId: welfareCase.assignedOfficerId,
        actorName: officer?.name ?? 'Welfare Officer',
        action: 'CROSS_PARISH_LOOKUP',
        entityType: 'case',
        entityId: welfareCase.id,
        beforeState: { status: 'pending' },
        afterState: {
          flags: welfareCase.riskFlags,
          priorParishes: beneficiary?.disbursementHistory.map((h) => h.parishName),
        },
      })
    }

    if (
      ['verified', 'escalated', 'approved', 'disbursed'].includes(welfareCase.status)
    ) {
      push({
        id: `audit-${welfareCase.id}-verified`,
        timestamp: new Date(
          new Date(welfareCase.createdAt).getTime() + 300_000,
        ).toISOString(),
        actorId: welfareCase.assignedOfficerId,
        actorName: officer?.name ?? 'Welfare Officer',
        action: 'VERIFIED',
        entityType: 'case',
        entityId: welfareCase.id,
        beforeState: { status: 'pending' },
        afterState: { status: 'verified' },
      })
    }

    if (welfareCase.status === 'escalated') {
      const pastor = staff.find((s) => s.id === `pastor-${welfareCase.parishId}`)
      push({
        id: `audit-${welfareCase.id}-escalated`,
        timestamp: new Date(
          new Date(welfareCase.createdAt).getTime() + 600_000,
        ).toISOString(),
        actorId: welfareCase.assignedOfficerId,
        actorName: officer?.name ?? 'Welfare Officer',
        action: 'ESCALATED_TO_PASTOR',
        entityType: 'case',
        entityId: welfareCase.id,
        beforeState: { status: 'verified' },
        afterState: { status: 'escalated', pastor: pastor?.name },
      })
    }

    if (
      welfareCase.status === 'approved' ||
      welfareCase.status === 'disbursed'
    ) {
      const approver = staff.find((s) => s.id === welfareCase.approvingOfficerId)
      push({
        id: `audit-${welfareCase.id}-approved`,
        timestamp: new Date(
          new Date(welfareCase.createdAt).getTime() + 900_000,
        ).toISOString(),
        actorId: welfareCase.approvingOfficerId!,
        actorName: approver?.name ?? 'Pastor',
        action: 'APPROVED',
        entityType: 'case',
        entityId: welfareCase.id,
        beforeState: { status: welfareCase.status === 'disbursed' ? 'escalated' : 'verified' },
        afterState: {
          status: 'approved',
          reason: welfareCase.decisionReason,
        },
      })
    }

    if (welfareCase.status === 'disbursed') {
      const payer = staff.find((s) => s.id === welfareCase.payingOfficerId)
      push({
        id: `audit-${welfareCase.id}-disbursed`,
        timestamp: new Date(
          new Date(welfareCase.createdAt).getTime() + 1_200_000,
        ).toISOString(),
        actorId: welfareCase.payingOfficerId!,
        actorName: payer?.name ?? 'Checker',
        action: 'DISBURSED',
        entityType: 'case',
        entityId: welfareCase.id,
        beforeState: { status: 'approved' },
        afterState: {
          status: 'disbursed',
          amountDisbursedKobo: welfareCase.amountDisbursedKobo,
        },
      })
    }

    if (welfareCase.status === 'rejected') {
      const rejector = staff.find((s) => s.id === welfareCase.approvingOfficerId)
      push({
        id: `audit-${welfareCase.id}-rejected`,
        timestamp: new Date(
          new Date(welfareCase.createdAt).getTime() + 800_000,
        ).toISOString(),
        actorId: welfareCase.approvingOfficerId!,
        actorName: rejector?.name ?? 'Pastor',
        action: 'REJECTED',
        entityType: 'case',
        entityId: welfareCase.id,
        beforeState: { status: 'verified' },
        afterState: {
          status: 'rejected',
          reason: welfareCase.decisionReason,
        },
      })
    }
  }

  return entries
}

export function verifyChain(entries: AuditEntry[]): {
  valid: boolean
  brokenAtId?: string
} {
  let prevHash = GENESIS_HASH
  for (const entry of entries) {
    if (entry.prevHash !== prevHash) {
      return { valid: false, brokenAtId: entry.id }
    }
    const expected = computeEntryHash(prevHash, {
      id: entry.id,
      timestamp: entry.timestamp,
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeState: entry.beforeState,
      afterState: entry.afterState,
    })
    if (expected !== entry.entryHash) {
      return { valid: false, brokenAtId: entry.id }
    }
    prevHash = entry.entryHash
  }
  return { valid: true }
}
