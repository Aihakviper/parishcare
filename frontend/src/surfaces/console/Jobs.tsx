import { RomanSection } from '../../components/ui/RomanSection'
import { JobStatusPill } from '../../components/ui/JobStatusPill'
import { EscrowBadge } from '../../components/ui/EscrowBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useJobs, useArtisans } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'
import { formatNaira } from '../../lib/formatters'
import { format } from 'date-fns'

export function ConsoleJobs() {
  const { data: jobs = [] } = useJobs({})
  const { data: artisans = [] } = useArtisans({})

  const name = (id: string) => artisans.find((a) => a.id === id)?.name.split(' ')[0] ?? '—'

  return (
    <div>
      <RomanSection index={2} title="ALL JOBS" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Camp job ledger</h1>

      {jobs.length === 0 ? (
        <EmptyState message="The queue is clear. The Camp is at peace." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-frame border border-hairline bg-bone">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-parchment-soft border-b border-hairline mono-tag">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Resident</th>
                <th className="p-3 text-left">Artisan</th>
                <th className="p-3 text-left">Trade</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Escrow</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 30).map((j) => (
                <tr key={j.id} className="border-b border-hairline/50">
                  <td className="p-3 font-mono text-xs">{format(new Date(j.createdAt), 'dd MMM')}</td>
                  <td className="p-3">{j.isHero ? 'Funmi' : name(j.artisanId)}</td>
                  <td className="p-3">{name(j.artisanId)}</td>
                  <td className="p-3 text-slate">{TRADE_LABELS[j.trade]}</td>
                  <td className="p-3"><JobStatusPill status={j.status} /></td>
                  <td className="p-3 font-semibold">{formatNaira(j.priceKobo)}</td>
                  <td className="p-3">
                    <EscrowBadge status={j.escrowStatus} amountKobo={j.priceKobo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
