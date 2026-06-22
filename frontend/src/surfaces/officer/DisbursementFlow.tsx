import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PAGE_TRANSITION } from '../../lib/motion'
import { useNavigate, useParams } from 'react-router-dom'
import { SlideOver } from './components/SlideOver'
import { Button } from '../../components/ui/Button'
import { mockApi } from '../../lib/mock-api'
import { useCaseDetail } from './hooks/useOfficerCases'
import { formatNaira } from '../../lib/formatters'
import { LIMITS } from '../../lib/roles'
import { truncateHash } from '../../lib/officer/format'

type PaymentMethod = 'bank' | 'ussd' | 'inkind' | 'cash'

export function DisbursementFlow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { welfareCase } = useCaseDetail(id)
  const [method, setMethod] = useState<PaymentMethod>('bank')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{
    hash: string
    amount: number
  } | null>(null)

  const [idempotencyKey] = useState(() => `idem-${id}-${crypto.randomUUID()}`)

  if (!welfareCase) return null

  const close = () => navigate(`/officer/case/${id}`)
  const amount = welfareCase.amountRequestedKobo
  const approverId = welfareCase.approvingOfficerId
  const payerId = `checker-${welfareCase.parishId}`
  const isOwnApproval = approverId === welfareCase.assignedOfficerId
  const blockedByMakerChecker =
    isOwnApproval && amount > LIMITS.MAKER_CHECKER_THRESHOLD

  const execute = async () => {
    setLoading(true)
    try {
      const result = await mockApi.executeDisbursement({
        caseId: welfareCase.id,
        payingOfficerId: payerId,
        idempotencyKey,
      })
      const chain = await mockApi.getAuditChain()
      const last = chain[chain.length - 1]
      setSuccess({
        hash: last?.entryHash ?? 'unknown',
        amount: result.amountDisbursedKobo ?? amount,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <SlideOver title="Disbursement" subtitle="Execute payment" onClose={close}>
        {success ? (
          <div className="space-y-4">
            <p className="display-tight text-xl text-verdigris font-semibold">
              {formatNaira(success.amount)} sent.
            </p>
            <div className="p-4 border border-hairline rounded-xl bg-bone">
              <p className="mono-tag">Audit chain</p>
              <motion.div
                className="mt-2 h-px bg-verdigris origin-left"
                initial={{ scaleX: reduceMotion ? 1 : 0 }}
                animate={{ scaleX: 1 }}
                transition={reduceMotion ? { duration: 0 } : PAGE_TRANSITION}
              />
              <p className="font-mono text-xs text-ink mt-3 break-all">
                Chain entry {truncateHash(success.hash)} recorded.
              </p>
            </div>
            <Button onClick={close} className="w-full">
              Done
            </Button>
          </div>
        ) : blockedByMakerChecker ? (
          <div className="p-4 border border-oxblood/30 rounded-xl bg-oxblood/5">
            <p className="text-sm text-ink">
              This case was approved by you. A different officer must execute the
              payment.
            </p>
          </div>
        ) : welfareCase.status !== 'approved' ? (
          <p className="text-sm text-slate">
            Case must be approved before disbursement.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="p-4 border border-hairline rounded-xl">
              <p className="mono-tag">Amount</p>
              <p className="display-tight text-2xl font-semibold mt-1">
                {formatNaira(amount)}
              </p>
            </div>

            <fieldset>
              <legend className="mono-tag mb-2">Payment method</legend>
              <div className="space-y-2">
                {(
                  [
                    ['bank', 'Bank transfer'],
                    ['ussd', 'USSD'],
                    ['inkind', 'In-kind'],
                    ['cash', 'Cash receipt'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm text-ink cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="method"
                      value={value}
                      checked={method === value}
                      onChange={() => setMethod(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mono-tag">Idempotency key</p>
              <p className="font-mono text-xs text-slate mt-1 break-all">
                {idempotencyKey}
              </p>
            </div>

            <Button
              onClick={execute}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Executing…' : 'Execute payment'}
            </Button>
          </div>
        )}
      </SlideOver>
    </AnimatePresence>
  )
}
