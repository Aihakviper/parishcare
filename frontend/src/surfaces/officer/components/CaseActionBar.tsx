import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { mockApi } from '../../../lib/mock-api'
import { canDo, LIMITS } from '../../../lib/roles'
import { formatNaira } from '../../../lib/formatters'
import type { Parish, WelfareCase } from '../../../lib/types/domain'
import { useSessionStore } from '../../../store/session'
import { useTourStore } from '../../../store/tour'
import { cn } from '../../../lib/cn'

interface CaseActionBarProps {
  welfareCase: WelfareCase
  parish: Parish | null
  onRefresh: () => void
}

export function CaseActionBar({
  welfareCase,
  parish,
  onRefresh,
}: CaseActionBarProps) {
  const navigate = useNavigate()
  const role = useSessionStore((s) => s.role)
  const setRole = useSessionStore((s) => s.setRole)
  const pendingAction = useTourStore((s) => s.pendingAction)
  const clearPendingAction = useTourStore((s) => s.clearPendingAction)
  const [busy, setBusy] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const amount = welfareCase.amountRequestedKobo
  const approveCheck = canDo(role, 'approve', { amountKobo: amount })
  const canApproveNow =
    approveCheck.allowed &&
    (welfareCase.status === 'verified' || welfareCase.status === 'pending')

  const handleEscalate = useCallback(async () => {
    setBusy(true)
    try {
      await mockApi.decideCase({
        caseId: welfareCase.id,
        decision: 'escalate',
        reason: 'Amount exceeds officer approval limit — pastor review requested.',
        actorId: welfareCase.assignedOfficerId,
      })
      onRefresh()
      const pastorName = parish?.pastorName ?? 'Pastor'
      setRole('pastor', `Escalated to ${pastorName} — now viewing as Pastor`)
      navigate('/pastor/approvals')
    } finally {
      setBusy(false)
      clearPendingAction()
    }
  }, [welfareCase, parish, onRefresh, setRole, navigate, clearPendingAction])

  useEffect(() => {
    if (pendingAction !== 'escalate') return
    if (welfareCase.status === 'escalated') {
      clearPendingAction()
      return
    }
    const t = window.setTimeout(() => {
      void handleEscalate()
    }, 0)
    return () => window.clearTimeout(t)
  }, [pendingAction, welfareCase.status, handleEscalate, clearPendingAction])

  const handleApprove = async () => {
    if (!canApproveNow) return
    setBusy(true)
    try {
      await mockApi.decideCase({
        caseId: welfareCase.id,
        decision: 'approve',
        reason: 'Approved within officer limit after verification.',
        actorId: welfareCase.assignedOfficerId,
      })
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    setBusy(true)
    try {
      await mockApi.decideCase({
        caseId: welfareCase.id,
        decision: 'reject',
        reason: declineReason,
        actorId: welfareCase.assignedOfficerId,
      })
      onRefresh()
      navigate('/officer')
    } finally {
      setBusy(false)
    }
  }

  const showDisburse =
    welfareCase.status === 'approved' &&
    amount <= LIMITS.OFFICER_DISBURSE_MAX

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-bone/95 backdrop-blur-sm" data-tour="escalate-bar">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {showDecline ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Written reason for declining"
              className="flex-1 border border-hairline rounded-xl px-3 py-2 text-sm"
            />
            <Button variant="secondary" onClick={handleDecline} disabled={busy}>
              Confirm decline
            </Button>
            <Button variant="ghost" onClick={() => setShowDecline(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative group">
              <Button
                onClick={handleApprove}
                disabled={!canApproveNow || busy}
                className={cn(!canApproveNow && 'cursor-not-allowed')}
                title={
                  !approveCheck.allowed
                    ? `${formatNaira(amount)} exceeds your ${formatNaira(LIMITS.OFFICER_APPROVE_MAX)} limit. Escalate to your pastor.`
                    : undefined
                }
              >
                Approve {formatNaira(amount)}
              </Button>
              {!approveCheck.allowed && canDo(role, 'approve').allowed && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-ink text-bone text-xs rounded-xl shadow-frame z-10"
                >
                  {formatNaira(amount)} exceeds your {formatNaira(LIMITS.OFFICER_APPROVE_MAX)}{' '}
                  limit. Escalate to your pastor.
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={handleEscalate}
              disabled={busy || welfareCase.status === 'escalated'}
              className="border-verdigris/40 text-verdigris hover:bg-verdigris/5"
            >
              Escalate to Pastor
            </Button>

            <Button variant="ghost" onClick={() => setShowDecline(true)} disabled={busy}>
              Decline with reason
            </Button>

            {showDisburse && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/officer/case/${welfareCase.id}/disburse`)}
              >
                Execute payment
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
