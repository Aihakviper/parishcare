import { useCallback, useEffect, useState } from 'react'
import type { Beneficiary, Parish, WelfareCase } from '../../../lib/types/domain'
import { operationalApi } from '../../../lib/api/operational'
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

async function fetchOfficerQueue(parishId: string) {
  const [caseList, parishes] = await Promise.all([
    operationalApi.listCases({ parishId }),
    operationalApi.listParishes(),
  ])
  const parish = parishes.find((x) => x.id === parishId) ?? null

  const active = caseList.filter((c) => ACTIVE_STATUSES.has(c.status))
  const withPeople: CaseWithBeneficiary[] = []

  for (const c of active) {
    const beneficiary = await operationalApi.getBeneficiary(c.beneficiaryId)
    if (beneficiary) {
      withPeople.push({ ...c, beneficiary })
    }
  }

  withPeople.sort((a, b) => {
    if (a.isHeroCase) return -1
    if (b.isHeroCase) return 1
    return b.priorityScore - a.priorityScore
  })

  return { cases: withPeople, parish }
}

export function useOfficerCases(): OfficerQueueData {
  const parishId = useSessionStore((s) => s.parishId)
  const [cases, setCases] = useState<CaseWithBeneficiary[]>([])
  const [parish, setParish] = useState<Parish | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchOfficerQueue(parishId)
      setCases(result.cases)
      setParish(result.parish)
    } finally {
      setLoading(false)
    }
  }, [parishId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await fetchOfficerQueue(parishId)
        if (cancelled) return
        setCases(result.cases)
        setParish(result.parish)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [parishId])

  return { cases, parish, loading, refresh: load }
}

async function fetchCaseDetail(caseId: string) {
  const welfareCase = await operationalApi.getCase(caseId)
  if (!welfareCase) {
    return { welfareCase: null, beneficiary: null, parish: null }
  }
  const [beneficiary, parishes] = await Promise.all([
    operationalApi.getBeneficiary(welfareCase.beneficiaryId),
    operationalApi.listParishes(),
  ])
  const parish = parishes.find((p) => p.id === welfareCase.parishId) ?? null
  return { welfareCase, beneficiary, parish }
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
      setData(await fetchCaseDetail(caseId))
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (!caseId) return
    let cancelled = false
    void (async () => {
      try {
        const result = await fetchCaseDetail(caseId)
        if (!cancelled) setData(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [caseId])

  if (!caseId) {
    return {
      welfareCase: null,
      beneficiary: null,
      parish: null,
      loading: false,
      refresh,
    }
  }

  return { ...data, loading, refresh }
}
