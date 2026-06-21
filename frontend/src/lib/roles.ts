export type StewardRole = 'officer' | 'pastor' | 'provincial' | 'auditor'

/** Monetary limits in kobo */
export const LIMITS = {
  OFFICER_APPROVE_MAX: 1_500_000,
  OFFICER_DISBURSE_MAX: 2_500_000,
  PASTOR_APPROVE_MAX: 10_000_000,
  MAKER_CHECKER_THRESHOLD: 5_000_000,
} as const

export type StewardAction =
  | 'view_assigned_cases'
  | 'view_parish_cases'
  | 'view_aggregate'
  | 'view_pii'
  | 'verify_beneficiary'
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'execute_payment'
  | 'verify_chain'
  | 'flag_parish'
  | 'create_case'

export interface CanDoResult {
  allowed: boolean
  reason: string
}

export interface CanDoContext {
  amountKobo?: number
  isOwnApproval?: boolean
}

const ACTION_MATRIX: Record<
  StewardRole,
  Partial<Record<StewardAction, true>>
> = {
  officer: {
    view_assigned_cases: true,
    view_pii: true,
    verify_beneficiary: true,
    approve: true,
    reject: true,
    escalate: true,
    execute_payment: true,
    create_case: true,
  },
  pastor: {
    view_parish_cases: true,
    view_pii: true,
    verify_beneficiary: true,
    approve: true,
    reject: true,
    escalate: true,
    create_case: true,
  },
  provincial: {
    view_aggregate: true,
    flag_parish: true,
  },
  auditor: {
    view_aggregate: true,
    verify_chain: true,
  },
}

export function canDo(
  role: StewardRole,
  action: StewardAction,
  context: CanDoContext = {},
): CanDoResult {
  const matrix = ACTION_MATRIX[role]
  if (!matrix[action]) {
    return {
      allowed: false,
      reason: `${roleLabel(role)} cannot perform this action.`,
    }
  }

  const amount = context.amountKobo ?? 0

  if (action === 'approve') {
    if (role === 'officer' && amount > LIMITS.OFFICER_APPROVE_MAX) {
      return {
        allowed: false,
        reason: 'Amount exceeds officer limit of ₦15,000 — escalate to Pastor.',
      }
    }
    if (role === 'pastor' && amount > LIMITS.PASTOR_APPROVE_MAX) {
      return {
        allowed: false,
        reason: 'Amount exceeds parish pastor limit of ₦100,000.',
      }
    }
  }

  if (action === 'execute_payment') {
    if (role !== 'officer') {
      return { allowed: false, reason: 'Only welfare officers execute payment.' }
    }
    if (context.isOwnApproval) {
      return {
        allowed: false,
        reason: 'Maker–checker: you cannot pay a case you approved above threshold.',
      }
    }
    if (amount > LIMITS.OFFICER_DISBURSE_MAX) {
      return {
        allowed: false,
        reason: 'Officer disbursement limit is ₦25,000.',
      }
    }
  }

  if (action === 'view_pii' && role === 'provincial') {
    return {
      allowed: false,
      reason: 'Provincial view shows aggregates only — no individual records.',
    }
  }

  return { allowed: true, reason: 'Permitted.' }
}

function roleLabel(role: StewardRole): string {
  const labels: Record<StewardRole, string> = {
    officer: 'Welfare Officer',
    pastor: 'Parish Pastor',
    provincial: 'Provincial Coordinator',
    auditor: 'Auditor',
  }
  return labels[role]
}

export interface RoleDefinition {
  id: StewardRole
  label: string
  contextLabel: string
  homePath: string
  navLabel: string
}

export const ROLES: RoleDefinition[] = [
  {
    id: 'officer',
    label: 'Officer',
    contextLabel: 'RCCG Ikorodu Central',
    homePath: '/officer',
    navLabel: "Officer's Queue",
  },
  {
    id: 'pastor',
    label: 'Pastor',
    contextLabel: 'RCCG Ikorodu Central',
    homePath: '/pastor',
    navLabel: 'Parish Pulse',
  },
  {
    id: 'provincial',
    label: 'Provincial',
    contextLabel: 'Province 8',
    homePath: '/provincial',
    navLabel: 'Provincial View',
  },
  {
    id: 'auditor',
    label: 'Auditor',
    contextLabel: 'Stewardship Integrity',
    homePath: '/auditor',
    navLabel: 'Audit Ledger',
  },
]

export const ROLE_ORDER: StewardRole[] = ROLES.map((r) => r.id)

export function getRole(id: StewardRole): RoleDefinition {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]
}

export function nextRole(current: StewardRole): StewardRole {
  const idx = ROLE_ORDER.indexOf(current)
  return ROLE_ORDER[(idx + 1) % ROLE_ORDER.length]
}

/** @deprecated Use canDo() for granular checks */
export const ROLE_PERMISSIONS: Record<
  StewardRole,
  { canApprove: boolean; canDisburse: boolean; canAudit: boolean; scope: string }
> = {
  officer: {
    canApprove: true,
    canDisburse: true,
    canAudit: false,
    scope: 'assigned_cases',
  },
  pastor: {
    canApprove: true,
    canDisburse: false,
    canAudit: false,
    scope: 'parish',
  },
  provincial: {
    canApprove: false,
    canDisburse: false,
    canAudit: false,
    scope: 'province_aggregate',
  },
  auditor: {
    canApprove: false,
    canDisburse: false,
    canAudit: true,
    scope: 'audit_metadata',
  },
}
