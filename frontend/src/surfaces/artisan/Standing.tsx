import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { ProgressBar } from '../../components/charts/ProgressBar'
import { useArtisan, HERO_IDS } from '../../hooks/useCampData'
import { computeTrustScore, nextTierRequirement } from '../../lib/trust-engine'

export function ArtisanStanding() {
  const { data: artisan } = useArtisan(HERO_IDS.artisanId)
  if (!artisan) return null

  const breakdown = computeTrustScore(artisan)
  const next = nextTierRequirement(artisan)
  const jobProgress = Math.min(100, (artisan.completedJobs / 50) * 100)

  return (
    <div>
      <RomanSection index={3} title="STANDING" />
      <div className="mt-4 text-center frame p-6">
        <TierPill tier="trusted" jobsCompleted={artisan.completedJobs} className="text-sm px-4 py-1" />
        <p className="display-tight text-xl font-semibold text-ink mt-4">
          You are a Trusted Steward.
        </p>
        <p className="italic-serif text-slate mt-2">
          Standing before kings is {next.jobsNeeded} jobs away.
        </p>
      </div>

      <div className="mt-6 flex justify-between items-center gap-2 px-2">
        {(['verified', 'trusted', 'steward'] as const).map((t, i) => (
          <div key={t} className={`flex-1 text-center ${i === 1 ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`h-2 rounded-full ${i <= 1 ? 'bg-verdigris' : 'bg-hairline'}`} />
            <p className="mono-tag mt-2 text-[0.55rem]">{t}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Completed jobs</span>
            <span className="font-semibold text-ink">{artisan.completedJobs} / 50</span>
          </div>
          <ProgressBar value={jobProgress} className="mt-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Rating</span>
            <span className="font-semibold text-ink">{artisan.averageRating} / 4.5+</span>
          </div>
          <ProgressBar value={96} className="mt-2" />
        </div>
      </div>

      <details className="mt-8 frame p-4">
        <summary className="font-semibold text-ink cursor-pointer">How the score works</summary>
        <ul className="mt-3 space-y-1 text-sm text-slate">
          <li>Identity: {breakdown.identity}/20</li>
          <li>Skill: {breakdown.skill}/20</li>
          <li>Volume: {breakdown.volume}/25</li>
          <li>Quality: {breakdown.quality}/25</li>
          <li>Tenure: {breakdown.tenure}/10</li>
          <li className="font-semibold text-ink pt-2">Total: {breakdown.total}</li>
        </ul>
      </details>
    </div>
  )
}
