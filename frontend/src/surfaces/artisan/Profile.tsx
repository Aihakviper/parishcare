import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { Button } from '../../components/ui/Button'
import { useArtisan, HERO_IDS } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'
import { formatPhone } from '../../lib/formatters'

export function ArtisanProfile() {
  const { data: artisan } = useArtisan(HERO_IDS.artisanId)
  if (!artisan) return null

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

      <Button variant="secondary" className="w-full mt-6">Re-record voice intro</Button>

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
