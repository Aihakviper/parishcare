import { useParams } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { Button } from '../../components/ui/Button'
import { useArtisan } from '../../hooks/useCampData'
import { computeTrustScore } from '../../lib/trust-engine'
import { TRADE_LABELS } from '../../lib/types/camp'
import { formatPhone } from '../../lib/formatters'

export function ConsoleArtisanDetail() {
  const { id } = useParams()
  const { data: artisan } = useArtisan(id)
  if (!artisan) return <p className="italic-serif text-slate py-12">Loading…</p>

  const tier = artisan.tier === 'unverified' ? 'verified' : artisan.tier
  const breakdown = computeTrustScore(artisan)

  return (
    <div>
      <RomanSection index={2} title="ARTISAN ADMIN" />
      <div className="flex flex-wrap items-start gap-4 mt-4">
        <img src={artisan.photoUrl} alt="" className="w-20 h-20 rounded-frame object-cover" />
        <div>
          <h1 className="display-tight text-2xl font-semibold text-ink">{artisan.name}</h1>
          <TierPill tier={tier} jobsCompleted={artisan.completedJobs} />
          <p className="text-slate mt-2">{TRADE_LABELS[artisan.trade]} · {artisan.serviceArea}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <div className="frame p-4">
          <p className="mono-tag">Verification</p>
          <p className="text-sm text-ink mt-2">NIN hash: <span className="font-mono text-xs">sha256:a8f3…9c2e</span></p>
          <p className="text-sm text-slate mt-1">Phone: {formatPhone(artisan.phone)}</p>
        </div>
        <div className="frame p-4">
          <p className="mono-tag">Trust breakdown</p>
          <ul className="mt-2 text-sm text-slate space-y-1">
            <li>Identity {breakdown.identity}/20</li>
            <li>Skill {breakdown.skill}/20</li>
            <li>Volume {breakdown.volume}/25</li>
            <li>Quality {breakdown.quality}/25</li>
            <li>Tenure {breakdown.tenure}/10</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-8">
        <Button variant="secondary">Suspend</Button>
        <Button variant="secondary">Boost tier review</Button>
        <Button variant="ghost">Add Camp endorsement</Button>
      </div>
    </div>
  )
}
