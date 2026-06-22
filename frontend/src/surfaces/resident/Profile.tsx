import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { AvatarInitials } from '../../components/ui/AvatarInitials'
import { TierPill } from '../../components/ui/TierPill'
import { useArtisans, HERO_IDS } from '../../hooks/useCampData'
import { formatPhone } from '../../lib/formatters'

export function ResidentProfile() {
  const { data: artisans = [] } = useArtisans({})
  const trusted = artisans.filter((a) => a.id === HERO_IDS.artisanId)

  return (
    <div>
      <RomanSection index={1} title="FUNMI ADEBANJO" />
      <div className="flex items-center gap-4 mt-4">
        <AvatarInitials name="Funmi Adebanjo" className="w-16 h-16 text-xl" />
        <div>
          <h1 className="display-tight text-xl font-semibold text-ink">Funmi Adebanjo</h1>
          <p className="text-sm text-slate">Phase 2 · Faith Avenue · House 14</p>
          <p className="mono-tag mt-1">{formatPhone('+2348034429817')}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="eyebrow">Payment methods</h2>
        <div className="mt-3 space-y-2">
          <div className="frame p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-ink">Visa •••• 4412</span>
            <span className="mono-tag">Default</span>
          </div>
          <div className="frame p-4 text-sm text-ink">GTBank · •••• 8821</div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="eyebrow">Trusted Stewards</h2>
        <div className="mt-3 space-y-2">
          {trusted.map((a) => (
            <Link key={a.id} to={`/resident/artisan/${a.id}`} className="frame p-4 flex items-center gap-3 hover:shadow-lift transition-shadow block">
              <img src={a.photoUrl} alt="" className="w-10 h-10 rounded-frame object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{a.name}</p>
                <TierPill tier="trusted" jobsCompleted={a.completedJobs} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="eyebrow">Settings</h2>
        <ul className="mt-3 frame divide-y divide-hairline">
          {['Language · English, Yoruba', 'Notifications · On', 'Privacy · Camp residents only'].map(
            (item) => (
              <li key={item} className="px-4 py-3 text-sm text-ink">
                {item}
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  )
}
