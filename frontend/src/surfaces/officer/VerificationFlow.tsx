import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { SlideOver } from './components/SlideOver'
import { Button } from '../../components/ui/Button'
import { mockApi } from '../../lib/mock-api'
import { useCaseDetail } from './hooks/useOfficerCases'
import { redactPhone } from '../../lib/officer/format'
import { getParishById, PARISH_YABA } from '../../lib/seed/parishes'

type Step = 1 | 2 | 3

export function VerificationFlow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { welfareCase, beneficiary } = useCaseDetail(id)
  const [step, setStep] = useState<Step>(1)
  const [sendVouch, setSendVouch] = useState(true)
  const [vouchComplete, setVouchComplete] = useState(false)

  const close = () => navigate(`/officer/case/${id}`)

  useEffect(() => {
    if (step !== 2 || !sendVouch) return
    const t = window.setTimeout(() => setVouchComplete(true), 4000)
    return () => window.clearTimeout(t)
  }, [step, sendVouch])

  if (!welfareCase || !beneficiary) return null

  const yaba = getParishById(PARISH_YABA)
  const homeHistory = beneficiary.disbursementHistory.find(
    (h) => h.parishId === PARISH_YABA,
  )

  const handleContinue = async () => {
    if (step === 1) {
      if (sendVouch) {
        await mockApi.requestVouch(welfareCase.id)
        setStep(2)
      } else {
        setStep(3)
      }
      return
    }
    if (step === 2 && vouchComplete) {
      setStep(3)
    }
  }

  return (
    <AnimatePresence>
      <SlideOver
        title="Verification"
        subtitle={beneficiary.name}
        onClose={close}
      >
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-ink">
              Confirm the phone number is the family&apos;s own.
            </p>
            <input
              type="tel"
              readOnly
              value={redactPhone(beneficiary.phone)}
              className="w-full font-mono text-sm border border-hairline bg-bone rounded-frame px-3 py-2.5"
            />
            <label className="flex items-start gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={sendVouch}
                onChange={(e) => setSendVouch(e.target.checked)}
                className="mt-1"
              />
              <span>
                Send vouch request to home parish?
                {homeHistory && (
                  <span className="block text-slate text-xs mt-1">
                    Will notify {yaba?.pastorName} at {yaba?.name}
                  </span>
                )}
              </span>
            </label>
            <Button onClick={handleContinue} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-ink">
              Vouch request sent to{' '}
              <strong>{yaba?.pastorName ?? 'Pastor M.O.'}</strong> at{' '}
              <strong>{yaba?.name ?? 'RCCG House on the Rock - Yaba'}</strong>
            </p>
            {!vouchComplete ? (
              <div className="p-4 border border-hairline rounded-frame bg-bone">
                <p className="mono-tag">Awaiting confirmation</p>
                <p className="text-sm text-slate mt-2">
                  Awaiting confirmation… (avg. 6 minutes)
                </p>
              </div>
            ) : (
              <div className="p-4 border border-verdigris/40 rounded-frame bg-verdigris/5">
                <p className="text-verdigris font-semibold text-sm">
                  Vouch received. Continue.
                </p>
              </div>
            )}
            {vouchComplete && (
              <Button onClick={handleContinue} className="w-full">
                Continue
              </Button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="p-4 border border-verdigris/40 rounded-frame bg-verdigris/5 text-center">
              <p className="text-verdigris font-semibold">Verification complete.</p>
            </div>
            <p className="italic-serif text-sm text-slate text-center border-t border-hairline pt-4">
              By the mouth of two or three witnesses shall every word be established. — Matt
              18:16
            </p>
            <Button onClick={close} className="w-full">
              Return to case
            </Button>
          </div>
        )}
      </SlideOver>
    </AnimatePresence>
  )
}
