import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { useCaseDetail } from './hooks/useOfficerCases'
import { PriorityGauge } from './components/PriorityGauge'
import { FactorBreakdown } from './components/FactorBreakdown'
import { VoiceNotePlayer } from './components/VoiceNotePlayer'
import { CaseActionBar } from './components/CaseActionBar'
import {
  formatRequestLine,
  initials,
  needCategoryLabel,
  redactPhone,
  riskFlagMessage,
  storyTagLine,
} from '../../lib/officer/format'
import { formatNaira } from '../../lib/formatters'
import { HERO_CASE_ID } from '../../lib/mock-api'
import type { RiskFlag } from '../../lib/types/domain'
import { useTourStore } from '../../store/tour'

const HERO_WHY_NOW =
  'School resumed Monday. Two children walking 4km.'

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { welfareCase, beneficiary, parish, loading, refresh } = useCaseDetail(id)
  const [officerNotes, setOfficerNotes] = useState('')
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null)
  const pendingAction = useTourStore((s) => s.pendingAction)
  const clearPendingAction = useTourStore((s) => s.clearPendingAction)
  const tourStep = useTourStore((s) => s.step)
  const tourActive = useTourStore((s) => s.active)

  const heroVoiceHistory = beneficiary?.disbursementHistory.find((h) => h.voiceNote)

  useEffect(() => {
    if (!heroVoiceHistory?.voiceNote) return
    if (tourActive && tourStep === 2) {
      setActiveVoiceId(heroVoiceHistory.id)
    }
  }, [tourActive, tourStep, heroVoiceHistory])

  useEffect(() => {
    if (!heroVoiceHistory?.voiceNote) return
    if (pendingAction === 'play-voice' || pendingAction === 'open-voice') {
      setActiveVoiceId(heroVoiceHistory.id)
      clearPendingAction()
    }
  }, [pendingAction, heroVoiceHistory, clearPendingAction])

  if (loading) {
    return <p className="text-slate text-sm py-12">Opening case file…</p>
  }

  if (!welfareCase || !beneficiary) {
    return (
      <p className="text-slate">
        Case not found.{' '}
        <Link to="/officer" className="text-oxblood underline">
          Return to queue
        </Link>
      </p>
    )
  }

  const firstNetwork = beneficiary.disbursementHistory[0]
  const crossParishFlag = welfareCase.riskFlags.includes('cross_parish_recent')
  const recencyNote =
    firstNetwork && crossParishFlag
      ? `(helped ${firstNetwork.daysAgo} days ago)`
      : undefined

  const whyNow =
    welfareCase.isHeroCase || welfareCase.id === HERO_CASE_ID
      ? HERO_WHY_NOW
      : welfareCase.narrative.split('.')[0] + '.'

  return (
    <>
      <div className="pb-28">
        <Link
          to="/officer"
          className="text-sm text-slate hover:text-oxblood mb-4 inline-block"
        >
          ← Today&apos;s queue
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <section className="lg:col-span-5 frame p-5 sm:p-6">
            <div
              className="w-20 h-20 bg-oxblood rounded-sm flex items-center justify-center text-bone display text-2xl font-semibold mb-4"
              aria-hidden
            >
              {initials(beneficiary.name)}
            </div>
            <h1 className="display-tight text-3xl sm:text-[2.5rem] font-semibold text-ink leading-tight">
              {beneficiary.name}
            </h1>
            <p className="font-mono text-sm text-slate mt-2">
              {redactPhone(beneficiary.phone)}
            </p>
            <p className="italic-serif text-sm text-slate mt-1">
              {storyTagLine(beneficiary.storyTag, beneficiary.dependents)}
            </p>

            {firstNetwork && (
              <p className="text-sm text-ink mt-4 pt-4 border-t border-hairline">
                First seen in our network:{' '}
                <strong>
                  {firstNetwork.daysAgo} days ago at {firstNetwork.parishName}
                </strong>
              </p>
            )}

            {beneficiary.disbursementHistory.length > 0 && (
              <div className="mt-5" data-tour="ngozi-history">
                <EyebrowLabel>Cross-parish history</EyebrowLabel>
                <ul className="mt-2 space-y-3">
                  {beneficiary.disbursementHistory.map((h) => (
                    <li
                      key={h.id}
                      className="text-sm border-b border-hairline/60 pb-3 last:border-0"
                    >
                      <p className="font-medium text-ink">{h.parishName}</p>
                      <p className="text-slate text-xs mt-0.5">
                        {needCategoryLabel(h.needCategory)} · {formatNaira(h.amountKobo)} ·{' '}
                        {h.daysAgo} days ago
                      </p>
                      {h.voiceNote && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveVoiceId(activeVoiceId === h.id ? null : h.id)
                          }
                          className="text-xs text-oxblood font-medium mt-1 hover:underline"
                        >
                          Hear pastor&apos;s note
                        </button>
                      )}
                      {h.voiceNote && activeVoiceId === h.id && (
                        <div data-tour="voice-note">
                          <VoiceNotePlayer
                            note={h.voiceNote}
                            className="mt-2"
                            autoPlay={
                              tourActive &&
                              tourStep === 2 &&
                              activeVoiceId === h.id
                            }
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(`/officer/case/${id}/verify`)}
              className="mt-5 w-full text-sm font-semibold text-verdigris border border-verdigris/40 rounded-frame py-2.5 hover:bg-verdigris/5 transition-colors"
            >
              Begin verification
            </button>
          </section>

          <section className="lg:col-span-4">
            <EyebrowLabel>II · Today&apos;s ask</EyebrowLabel>
            <p className="display-tight text-2xl sm:text-3xl font-semibold text-ink mt-2">
              {formatRequestLine(
                welfareCase.amountRequestedKobo,
                welfareCase.needCategory,
              )}
            </p>
            <div className="mt-4">
              <p className="mono-tag">Why now</p>
              <p className="text-sm text-ink mt-1">{whyNow}</p>
            </div>
            <p className="text-sm text-slate mt-4 leading-relaxed">
              {welfareCase.narrative}
            </p>
            <label className="block mt-6">
              <span className="mono-tag">Officer notes</span>
              <textarea
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="What did you observe?"
                rows={4}
                className="mt-2 w-full border border-hairline bg-bone rounded-frame px-3 py-2.5 text-sm text-ink resize-none focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-oxblood/30"
              />
            </label>
          </section>

          <section className="lg:col-span-3 frame p-5">
            <EyebrowLabel>III · Steward&apos;s read</EyebrowLabel>
            <div className="mt-4">
              <PriorityGauge score={welfareCase.priorityScore} />
            </div>
            <div className="mt-6">
              <FactorBreakdown
                breakdown={welfareCase.scoreBreakdown}
                recencyNote={recencyNote}
              />
            </div>
            {welfareCase.riskFlags.length > 0 && (
              <ul className="mt-6 space-y-2">
                {welfareCase.riskFlags.map((flag: RiskFlag) => (
                  <li
                    key={flag}
                    className="text-xs text-oxblood border-l-2 border-oxblood pl-2 py-1"
                  >
                    {flag === 'cross_parish_recent' && firstNetwork
                      ? riskFlagMessage(flag, {
                          parishName: firstNetwork.parishName,
                          daysAgo: firstNetwork.daysAgo,
                        })
                      : riskFlagMessage(flag)}
                  </li>
                ))}
              </ul>
            )}
            <p className="italic-serif text-sm text-slate mt-6 pt-4 border-t border-hairline">
              The score is a question, not an answer. You decide.
            </p>
          </section>
        </div>
      </div>

      <CaseActionBar
        welfareCase={welfareCase}
        parish={parish}
        onRefresh={refresh}
      />

      <Outlet />
    </>
  )
}
