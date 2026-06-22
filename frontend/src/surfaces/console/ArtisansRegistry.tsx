import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { EmptyState } from '../../components/ui/EmptyState'
import { useArtisans } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'

export function ConsoleArtisans() {
  const { data: artisans = [] } = useArtisans({})

  return (
    <div>
      <RomanSection index={1} title="ARTISAN REGISTRY" />
      <div className="flex items-center justify-between mt-3">
        <h1 className="display-tight text-2xl font-semibold text-ink">All Stewards</h1>
        <button type="button" className="mono-tag text-oxblood hover:underline">Export CSV</button>
      </div>

      {artisans.length === 0 ? (
        <EmptyState message="No artisans registered yet." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-frame border border-hairline bg-bone">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-parchment-soft border-b border-hairline">
              <tr className="text-left mono-tag">
                <th className="p-3">Name</th>
                <th className="p-3">Trade</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Score</th>
                <th className="p-3">Jobs</th>
                <th className="p-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {artisans.map((a) => {
                const tier = a.tier === 'unverified' ? 'verified' : a.tier
                return (
                  <tr key={a.id} className="border-b border-hairline/60 hover:bg-parchment-soft/50">
                    <td className="p-3">
                      <Link to={`/console/artisans/${a.id}`} className="font-semibold text-ink hover:text-oxblood">
                        {a.name}
                      </Link>
                    </td>
                    <td className="p-3 text-slate">{TRADE_LABELS[a.trade]}</td>
                    <td className="p-3"><TierPill tier={tier} /></td>
                    <td className="p-3 font-mono text-xs">{a.trustScore}</td>
                    <td className="p-3">{a.completedJobs}</td>
                    <td className="p-3">{a.averageRating.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
