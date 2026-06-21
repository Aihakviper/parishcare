import { useCallback, useEffect, useState } from 'react'
import type { Beneficiary, Parish, WelfareCase } from '../../../lib/types/domain'
import { mockApi } from '../../../lib/mock-api'
import { useSessionStore } from '../../../store/session'

export type CaseWithBeneficiary = WelfareCase & {
  beneficiary: Beneficiary
}

interface OfficerQueueData {
  cases: CaseWithBeneficiary[]
  parish: Parish | null
  loading: boolean
  refresh: () => void
}

const ACTIVE_STATUSES = new Set([
  'pending',
  'verified',
  'escalated',
  'approved',
])

export function useOfficerCases(): OfficerQueueData {
  const parishId = useSessionStore((s) => s.parishId)
  const [cases, setCases] = useState<CaseWithBeneficiary[]>([])
  const [parish, setParish] = useState<Parish | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [caseList, parishes] = await Promise.all([
        mockApi.listCases({ parishId }),
        mockApi.listParishes(),
      ])
      const p = parishes.find((x) => x.id === parishId) ?? null
      setParish(p)

      const active = caseList.filter((c) => ACTIVE_STATUSES.has(c.status))
      const withPeople: CaseWithBeneficiary[] = []

      for (const c of active) {
        const beneficiary = await mockApi.getBeneficiary(c.beneficiaryId)
        if (beneficiary) {
          withPeople.push({ ...c, beneficiary })
        }
      }

      withPeople.sort((a, b) => {
        if (a.isHeroCase) return -1
        if (b.isHeroCase) return 1
        return b.priorityScore - a.priorityScore
      })
      setCases(withPeople)
    } finally {
      setLoading(false)
    }
  }, [parishId])

  useEffect(() => {
    load()
  }, [load])

  return { cases, parish, loading, refresh: load }
}

export function useCaseDetail(caseId: string | undefined) {
  const [data, setData] = useState<{
    welfareCase: WelfareCase | null
    beneficiary: Beneficiary | null
    parish: Parish | null
  }>({ welfareCase: null, beneficiary: null, parish: null })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    try {
      const welfareCase = await mockApi.getCase(caseId)
      if (!welfareCase) {
        setData({ welfareCase: null, beneficiary: null, parish: null })
        return
      }
      const [beneficiary, parishes] = await Promise.all([
        mockApi.getBeneficiary(welfareCase.beneficiaryId),
        mockApi.listParishes(),
      ])
      const parish = parishes.find((p) => p.id === welfareCase.parishId) ?? null
      setData({ welfareCase, beneficiary, parish })
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...data, loading, refresh }
}
