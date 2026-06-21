import { useCallback, useEffect, useState } from 'react'
import { mockApi } from '../../../lib/mock-api'
import type { AuditEntry, ChainIntegrityResult } from '../../../lib/types/domain'
import {
  presentAuditChain,
  type AuditDisplayEntry,
} from '../../../lib/auditor/present'

interface AuditData {
  chain: AuditEntry[]
  displayed: AuditDisplayEntry[]
  integrity: ChainIntegrityResult | null
  loading: boolean
  checking: boolean
  lastCheckedAt: Date | null
  refresh: () => Promise<void>
  runIntegrityCheck: () => Promise<ChainIntegrityResult>
}

export function useAuditData(): AuditData {
  const [chain, setChain] = useState<AuditEntry[]>([])
  const [displayed, setDisplayed] = useState<AuditDisplayEntry[]>([])
  const [integrity, setIntegrity] = useState<ChainIntegrityResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [auditChain, cases, parishes] = await Promise.all([
        mockApi.getAuditChain(),
        mockApi.listCases(),
        mockApi.listParishes(),
      ])
      const parishByCase = new Map(
        cases.map((c) => [c.id, c.parishId]),
      )
      setChain(auditChain)
      setDisplayed(presentAuditChain(auditChain, parishByCase, parishes))
      const result = await mockApi.verifyChainIntegrity()
      setIntegrity(result)
      setLastCheckedAt(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  const runIntegrityCheck = useCallback(async () => {
    setChecking(true)
    await new Promise((r) => setTimeout(r, 1200))
    try {
      const result = await mockApi.verifyChainIntegrity()
      setIntegrity(result)
      setLastCheckedAt(new Date())
      return result
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    chain,
    displayed,
    integrity,
    loading,
    checking,
    lastCheckedAt,
    refresh: load,
    runIntegrityCheck,
  }
}
