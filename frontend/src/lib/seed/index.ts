import type { SeedBundle } from '../types/domain'
import { buildAuditChainFromCases } from './audit'
import { cases } from './cases'
import { people } from './people'
import { parishes } from './parishes'
import { staff } from './staff'

export function buildSeedBundle(): SeedBundle {
  const auditChain = buildAuditChainFromCases(cases)

  return {
    parishes,
    people,
    staff,
    cases: structuredClone(cases),
    auditChain,
    vouchers: [],
  }
}

export { parishes, people, staff, cases }
