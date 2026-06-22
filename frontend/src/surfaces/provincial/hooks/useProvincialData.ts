import { useCallback, useEffect, useState } from 'react'
import { mockApi } from '../../../lib/mock-api'
import {
  buildProvincialAggregates,
  type ProvincialDashboardData,
} from '../../../lib/provincial/aggregates'

export function useProvincialData() {
  const [data, setData] = useState<ProvincialDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [parishes, cases] = await Promise.all([
        mockApi.listParishes(),
        mockApi.listCases(),
      ])
      setData(
        buildProvincialAggregates(
          parishes,
          cases.map((c) => ({
            parishId: c.parishId,
            status: c.status,
            createdAt: c.createdAt,
            priorityScore: c.priorityScore,
            needCategory: c.needCategory,
            beneficiaryId: c.beneficiaryId,
          })),
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [parishes, cases] = await Promise.all([
          mockApi.listParishes(),
          mockApi.listCases(),
        ])
        if (cancelled) return
        setData(
          buildProvincialAggregates(
            parishes,
            cases.map((c) => ({
              parishId: c.parishId,
              status: c.status,
              createdAt: c.createdAt,
              priorityScore: c.priorityScore,
              needCategory: c.needCategory,
              beneficiaryId: c.beneficiaryId,
            })),
          ),
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, refresh: load }
}
