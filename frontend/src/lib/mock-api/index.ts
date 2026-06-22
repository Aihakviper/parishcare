import type { Beneficiary, Parish, WelfareCase } from '../types/domain'

export type ListCasesFilter = {
  parishId?: string
  status?: string
}

/** Mock API — full Camp Smart City data lands in PROMPT 2. */
export async function resetDemo(): Promise<void> {
  localStorage.removeItem('steward_demo_v2')
}

async function notImplemented(): Promise<never> {
  throw new Error('Mock API not implemented yet — PROMPT 2')
}

export const mockApi = {
  resetDemo,
  listCases: async (_filter: ListCasesFilter = {}): Promise<WelfareCase[]> => [],
  getCase: async (_id: string): Promise<WelfareCase | null> => null,
  getBeneficiary: async (_id: string): Promise<Beneficiary | null> => null,
  listParishes: async (): Promise<Parish[]> => [],
  decideCase: async (_input: unknown): Promise<WelfareCase> => notImplemented(),
  requestVouch: async (_caseId: string): Promise<void> => notImplemented(),
  executeDisbursement: async (_input: unknown): Promise<WelfareCase> => notImplemented(),
  getAuditChain: async (): Promise<{ entryHash: string }[]> => [],
}
