import type { Parish, WelfareCase } from '../types/domain'
import { mockApi, type ListCasesFilter } from '../mock-api'
import { useSessionStore } from '../../store/session'
import { backendApi } from './backend'
import { usesBackendApi } from './config'

export const operationalApi = {
  async listCases(filter: ListCasesFilter = {}): Promise<WelfareCase[]> {
    if (!usesBackendApi) return mockApi.listCases(filter)
    let cases = await backendApi.listCases()
    if (filter.parishId) {
      cases = cases.filter((item) => item.parishId === filter.parishId)
    }
    if (filter.status) {
      cases = cases.filter((item) => item.status === filter.status)
    }
    return cases
  },

  getCase(caseId: string) {
    return usesBackendApi
      ? backendApi.getCase(caseId)
      : mockApi.getCase(caseId)
  },

  getBeneficiary(beneficiaryId: string) {
    return usesBackendApi
      ? backendApi.getBeneficiary(beneficiaryId)
      : mockApi.getBeneficiary(beneficiaryId)
  },

  async listParishes(): Promise<Parish[]> {
    if (!usesBackendApi) return mockApi.listParishes()
    const parishId = useSessionStore.getState().parishId
    return [await backendApi.getParish(parishId)]
  },

  async decideCase(input: {
    caseId: string
    decision: 'approve' | 'reject' | 'escalate'
    reason: string
    actorId: string
  }): Promise<WelfareCase> {
    if (!usesBackendApi) return mockApi.decideCase(input)
    return backendApi.decideCase(input)
  },

  async requestVouch(caseId: string): Promise<void> {
    if (!usesBackendApi) {
      await mockApi.requestVouch(caseId)
      return
    }
    await backendApi.requestVouch(caseId)
  },

  async executeDisbursement(input: {
    caseId: string
    payingOfficerId: string
    idempotencyKey: string
    amountKobo: number
  }): Promise<{ welfareCase: WelfareCase; reference: string }> {
    if (!usesBackendApi) {
      const welfareCase = await mockApi.executeDisbursement(input)
      const chain = await mockApi.getAuditChain()
      return {
        welfareCase,
        reference: chain.at(-1)?.entryHash ?? 'unknown',
      }
    }
    const result = await backendApi.executeDisbursement(input)
    const welfareCase = await backendApi.getCase(input.caseId)
    if (!welfareCase) throw new Error('Disbursed case could not be reloaded')
    return { welfareCase, reference: result.rail_reference }
  },
}
