import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { Button } from '../../components/ui/Button'
import { PriorityGauge } from '../officer/components/PriorityGauge'
import { FactorBreakdown } from '../officer/components/FactorBreakdown'
import { HERO_CASE_ID } from '../../lib/mock-api'
import { operationalApi } from '../../lib/api/operational'
import { usesBackendApi } from '../../lib/api/config'
import { formatNaira } from '../../lib/formatters'
import { needCategoryLabel, riskFlagMessage } from '../../lib/officer/format'
import type { Beneficiary, Parish, WelfareCase } from '../../lib/types/domain'
import { useTourStore } from '../../store/tour'

const SAMPLE_REASON =
  'Confirmed need with home parish. Approved.'

export function PastorApprovals() {
  const [welfareCase, setWelfareCase] = useState<WelfareCase | null>(null)
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null)
  const [parish, setParish] = useState<Parish | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)

  const pendingAction = useTourStore((s) => s.pendingAction)
  const clearPendingAction = useTourStore((s) => s.clearPendingAction)
  const tourActive = useTourStore((s) => s.active)

  const getReviewCase = useCallback(async () => {
    if (!usesBackendApi) return operationalApi.getCase(HERO_CASE_ID)
    const cases = await operationalApi.listCases()
    return (
      cases
        .filter((item) => item.status === 'verified')
        .sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? null
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const c = await getReviewCase()
      if (!c) return
      setWelfareCase(c)
      const [b, parishes] = await Promise.all([
        operationalApi.getBeneficiary(c.beneficiaryId),
        operationalApi.listParishes(),
      ])
      setBeneficiary(b)
      setParish(parishes.find((p) => p.id === c.parishId) ?? null)
    } finally {
      setLoading(false)
    }
  }, [getReviewCase])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const c = await getReviewCase()
        if (!c || cancelled) return
        setWelfareCase(c)
        const [b, parishes] = await Promise.all([
          operationalApi.getBeneficiary(c.beneficiaryId),
          operationalApi.listParishes(),
        ])
        if (cancelled) return
        setBeneficiary(b)
        setParish(parishes.find((p) => p.id === c.parishId) ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getReviewCase])

  useEffect(() => {
    if (pendingAction !== 'approve-pastor' || !welfareCase || !parish) return
    if (welfareCase.status !== 'escalated') {
      clearPendingAction()
      return
    }
    const prep = window.setTimeout(() => {
      setReason(SAMPLE_REASON)
      setAcknowledged(true)
    }, 0)
    const approve = window.setTimeout(() => {
      void (async () => {
        setBusy(true)
        try {
          await operationalApi.decideCase({
            caseId: welfareCase.id,
            decision: 'approve',
            reason: SAMPLE_REASON,
            actorId: `pastor-${parish.id}`,
          })
          await load()
        } finally {
          setBusy(false)
          clearPendingAction()
        }
      })()
    }, 600)
    return () => {
      window.clearTimeout(prep)
      window.clearTimeout(approve)
    }
  }, [pendingAction, welfareCase, parish, clearPendingAction, load])

  const handleApprove = async () => {
    if (!welfareCase || !parish || !reason.trim() || !acknowledged) return
    setBusy(true)
    try {
      await operationalApi.decideCase({
        caseId: welfareCase.id,
        decision: 'approve',
        reason: reason.trim(),
        actorId: `pastor-${parish.id}`,
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-slate text-sm py-12">Loading pastor approvals…</p>
  }

  if (!welfareCase || !beneficiary) {
    return (
      <EmptyState>
        No escalated cases await your pen. A quiet day for judgment.
      </EmptyState>
    )
  }

  const firstNetwork = beneficiary.disbursementHistory[0]
  const crossFlag = welfareCase.riskFlags.includes('cross_parish_recent')
  const recencyNote =
    firstNetwork && crossFlag
      ? `(helped ${firstNetwork.daysAgo} days ago)`
      : undefined

  const canApprove =
    (usesBackendApi
      ? welfareCase.status === 'verified'
      : welfareCase.status === 'escalated') &&
    reason.trim().length > 0 &&
    acknowledged &&
    !busy

  return (
    <div data-tour="pastor-approval">
      <header className="mb-6">
        <EyebrowLabel>III · Pastor review</EyebrowLabel>
        <h1 className="display-tight text-2xl sm:text-3xl font-semibold text-ink mt-2">
          {welfareCase.status === 'approved' || welfareCase.status === 'disbursed'
            ? 'Decision recorded.'
            : 'A case needs your judgment.'}
        </h1>
        <p className="mono-tag mt-2">
          {parish?.pastorName ?? 'Pastor'} · {parish?.name}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 frame p-5 order-1">
          <p className="mono-tag">Beneficiary</p>
          <h2 className="display-tight text-2xl font-semibold text-ink mt-1">
            {beneficiary.name}
          </h2>
          <p className="text-sm text-slate mt-2">
            {needCategoryLabel(welfareCase.needCategory)} ·{' '}
            {formatNaira(welfareCase.amountRequestedKobo)}
          </p>
          {firstNetwork && (
            <p className="text-sm text-ink mt-4 pt-4 border-t border-hairline">
              Prior care at <strong>{firstNetwork.parishName}</strong> ·{' '}
              {firstNetwork.daysAgo} days ago
            </p>
          )}
          <p className="text-sm text-slate mt-4 leading-relaxed">{welfareCase.narrative}</p>
          <p className="mono-tag mt-4">Officer note</p>
          <p className="text-sm text-ink mt-1 italic-serif">
            Amount exceeds officer approval limit — pastor review requested.
          </p>
        </section>

        <section className="lg:col-span-4 frame p-5 order-2">
          <EyebrowLabel>Steward&apos;s read</EyebrowLabel>
          <div className="mt-4" data-tour="pastor-score">
            <PriorityGauge score={welfareCase.priorityScore} />
          </div>
          <div className="mt-6">
            <FactorBreakdown
              breakdown={welfareCase.scoreBreakdown}
              recencyNote={recencyNote}
            />
          </div>
          {crossFlag && firstNetwork && (
            <p className="text-xs text-oxblood border-l-2 border-oxblood pl-2 mt-4">
              {riskFlagMessage('cross_parish_recent', {
                parishName: firstNetwork.parishName,
                daysAgo: firstNetwork.daysAgo,
              })}
            </p>
          )}
        </section>

        <section className="lg:col-span-3 order-3">
          <div className="frame p-5" data-tour="pastor-approve-form">
            <p className="mono-tag">Decision</p>
            <label className="block mt-3">
              <span className="text-xs text-slate">Reason (required)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Why are you approving or declining?"
                disabled={
                  (usesBackendApi
                    ? welfareCase.status !== 'verified'
                    : welfareCase.status !== 'escalated') ||
                  (tourActive && busy)
                }
                className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5 text-sm resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam"
              />
            </label>
            <label className="flex items-start gap-2 mt-4 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={
                  usesBackendApi
                    ? welfareCase.status !== 'verified'
                    : welfareCase.status !== 'escalated'
                }
                className="mt-1 accent-oxblood"
              />
              <span>
                I have reviewed the case file and cross-parish history. This decision is
                recorded in the audit chain.
              </span>
            </label>
            <Button
              type="button"
              className="w-full mt-5"
              disabled={!canApprove}
              onClick={() => void handleApprove()}
            >
              Approve {formatNaira(welfareCase.amountRequestedKobo)}
            </Button>
            {welfareCase.status === 'approved' && (
              <p className="text-xs text-verdigris mt-3 font-medium">
                ✓ Approved — written to chain
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
