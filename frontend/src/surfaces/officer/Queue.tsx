import { useMemo } from 'react'
import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { useOfficerCases } from './hooks/useOfficerCases'
import { QueueRow } from './components/QueueRow'
import { countToHeadingWord } from '../../lib/officer/format'
import type { CaseStatus } from '../../lib/types/domain'

function countByStatus(cases: { status: CaseStatus }[], status: CaseStatus) {
  return cases.filter((c) => c.status === status).length
}

export function OfficerQueue() {
  const { cases, parish, loading } = useOfficerCases()

  const pending = useMemo(() => countByStatus(cases, 'pending'), [cases])
  const verified = useMemo(() => countByStatus(cases, 'verified'), [cases])
  const escalated = useMemo(() => countByStatus(cases, 'escalated'), [cases])

  const parishShort = parish?.name.replace(/^RCCG\s*/, '') ?? 'Ikorodu Central'
  const officerName = parish?.welfareOfficerName ?? 'Deacon Adeyemi O.'

  if (loading) {
    return (
      <div className="py-16 text-center text-slate text-sm">Loading today&apos;s queue…</div>
    )
  }

  if (pending === 0 && cases.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 sm:py-24 text-center px-4">
        <p className="italic-serif text-xl sm:text-2xl text-ink">
          The queue is clear. Take fifteen minutes.
        </p>
        <p className="display text-base sm:text-lg text-ink mt-8 text-left leading-relaxed">
          <span className="float-left display text-5xl text-oxblood mr-3 mt-1 leading-none">
            W
          </span>
          hen the waiting bench is empty, it is not idleness — it is the rare gift of a parish
          caught up on its care. Walk the corridor. Pray for the families you have already served.
          The ledger will call again soon enough.
        </p>
      </div>
    )
  }

  return (
    <div data-tour="officer-queue">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <EyebrowLabel>I · Today&apos;s care</EyebrowLabel>
            <h1 className="display-tight text-2xl sm:text-3xl font-semibold text-ink mt-2">
              {countToHeadingWord(pending || cases.length)} families need a hand.
            </h1>
          </div>
          <p className="mono-tag sm:text-right shrink-0">
            Officer · {officerName} · RCCG {parishShort}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 pt-4 border-t border-hairline text-sm text-slate">
          <span>
            <strong className="text-ink">{pending}</strong> pending
          </span>
          <span>
            <strong className="text-ink">{verified}</strong> verified
          </span>
          <span>
            <strong className="text-ink">{escalated}</strong> escalated
          </span>
          <span className="text-hairline hidden sm:inline">|</span>
          <span className="mono-tag normal-case">sorted by priority ▼</span>
        </div>
      </header>

      {cases.length === 0 ? (
        <div className="max-w-lg mx-auto py-12 text-center">
          <p className="italic-serif text-xl text-ink">
            The queue is clear. Take fifteen minutes.
          </p>
          <p className="display text-base text-ink mt-6 text-left leading-relaxed">
            <span className="float-left display text-5xl text-oxblood mr-3 mt-1 leading-none">
              W
            </span>
            hen the waiting bench is empty, it is not idleness — it is the rare gift of a parish
            caught up on its care.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((item, index) => (
            <li key={item.id}>
              <QueueRow item={item} index={index} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
