import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { Button } from '../../components/ui/Button'
import { TrustPillars } from '../../components/ui/TrustPillars'
import { useArtisan, useLineage, useGenerosity, HERO_IDS } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'
import { getPillarBreakdown } from '../../lib/trust-engine'
import { formatPhone } from '../../lib/formatters'

export function ArtisanProfile() {
  const { data: artisan } = useArtisan(HERO_IDS.artisanId)
  const { data: lineage = [] } = useLineage(HERO_IDS.artisanId)
  const { data: generosity = [] } = useGenerosity(HERO_IDS.artisanId)
  if (!artisan) return null

  const pillars = getPillarBreakdown(artisan)

  return (
    <div>
      <RomanSection index={4} title="MY PROFILE" />
      <div className="flex items-center gap-4 mt-4">
        <img src={artisan.photoUrl} alt="" className="w-16 h-16 rounded-frame object-cover" />
        <div>
          <h1 className="display-tight text-xl font-semibold text-ink">{artisan.name}</h1>
          <TierPill tier="trusted" jobsCompleted={artisan.completedJobs} />
          <p className="text-sm text-slate mt-1">{TRADE_LABELS[artisan.trade]}</p>
        </div>
      </div>

      <TrustPillars pillars={pillars} className="mt-4" />

      <dl className="mt-6 frame divide-y divide-hairline text-sm">
        <div className="px-4 py-3 flex justify-between">
          <dt className="text-slate">Phone</dt>
          <dd className="font-mono text-xs">{formatPhone(artisan.phone)}</dd>
        </div>
        <div className="px-4 py-3 flex justify-between">
          <dt className="text-slate">Service area</dt>
          <dd className="text-ink">{artisan.serviceArea}</dd>
        </div>
        <div className="px-4 py-3 flex justify-between">
          <dt className="text-slate">Languages</dt>
          <dd className="text-ink capitalize">{artisan.languages.join(', ')}</dd>
        </div>
      </dl>

      <div className="mt-6 frame p-4">
        <p className="eyebrow">Lineage</p>
        <ol className="mt-2 space-y-1 text-sm text-ink">
          {lineage.map((n) => (
            <li key={n.id}>
              {n.name} <span className="text-slate capitalize">({n.role})</span>
            </li>
          ))}
        </ol>
      </div>

      {generosity.length > 0 && (
        <div className="mt-4 frame p-4">
          <p className="eyebrow">Generosity</p>
          <ul className="mt-2 text-sm text-slate space-y-1">
            {generosity.map((g) => (
              <li key={g.id}>{g.beneficiaryLabel} · {g.actType.replace('_', ' ')}</li>
            ))}
          </ul>
        </div>
      )}

      <Link to="/artisan/apprenticeship" className="block mt-4">
        <Button variant="secondary" className="w-full">My apprentices</Button>
      </Link>
      <Link to="/artisan/mentor" className="block mt-2">
        <Button variant="ghost" className="w-full">I want to mentor</Button>
      </Link>

      <Button variant="secondary" className="w-full mt-4">Re-record voice intro</Button>

      <div className="mt-6">
        <p className="eyebrow">Sample work</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {artisan.workPhotos.map((url) => (
            <img key={url} src={url} alt="" className="aspect-square rounded-frame object-cover" loading="lazy" />
          ))}
        </div>
      </div>
    </div>
  )
}
