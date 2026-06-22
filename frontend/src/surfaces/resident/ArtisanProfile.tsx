import { Link, useParams } from 'react-router-dom'
import { FaPlay, FaStar } from 'react-icons/fa6'
import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/charts/ProgressBar'
import { useArtisan } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'
import { nextTierRequirement } from '../../lib/trust-engine'
import { formatNaira } from '../../lib/formatters'

export function ResidentArtisanProfile() {
  const { id } = useParams()
  const { data: artisan, isLoading } = useArtisan(id)

  if (isLoading || !artisan) {
    return <p className="text-slate italic-serif py-12">Loading profile…</p>
  }

  const tier = artisan.tier === 'unverified' ? 'verified' : artisan.tier
  const next = nextTierRequirement(artisan)
  const progress = Math.min(100, (artisan.completedJobs / 50) * 100)

  return (
    <div className="pb-24">
      <img
        src={artisan.workPhotos[0]}
        alt=""
        className="w-full aspect-[4/3] object-cover rounded-frame -mx-0"
      />
      <div className="mt-4">
        <RomanSection index={2} title="ARTISAN PROFILE" />
        <div className="flex items-start justify-between gap-3 mt-2">
          <h1 className="display-tight text-2xl font-semibold text-ink">{artisan.name}</h1>
          <TierPill tier={tier} jobsCompleted={artisan.completedJobs} />
        </div>
        <p className="text-slate mt-1">{TRADE_LABELS[artisan.trade]} · {artisan.serviceArea}</p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            ['Jobs', String(artisan.completedJobs)],
            ['Rating', artisan.averageRating.toFixed(1)],
            ['Experience', `${artisan.yearsExperience} yrs`],
            ['Response', `${artisan.responseMinutes ?? 15} min`],
          ].map(([k, v]) => (
            <div key={k} className="frame p-3 text-center">
              <p className="mono-tag">{k}</p>
              <p className="display-tight text-xl font-semibold text-ink mt-1">{v}</p>
            </div>
          ))}
        </div>

        {artisan.voiceIntro && (
          <div className="mt-6 frame p-4">
            <p className="mono-tag">Voice introduction</p>
            <button
              type="button"
              className="mt-3 flex items-center gap-3 w-full text-left"
              aria-label="Play voice introduction"
            >
              <span className="w-12 h-12 rounded-full bg-oxblood text-bone flex items-center justify-center shrink-0">
                <FaPlay aria-hidden />
              </span>
              <span>
                <span className="font-semibold text-ink block">Hear from {artisan.name.split(' ')[0]}</span>
                <span className="text-xs text-slate">{artisan.voiceIntro.durationSeconds}s</span>
              </span>
            </button>
            <p className="italic-serif text-sm text-slate mt-3 leading-relaxed">
              {artisan.voiceIntro.transcript}
            </p>
          </div>
        )}

        <div className="mt-6">
          <p className="eyebrow">Sample work</p>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
            {artisan.workPhotos.map((url) => (
              <img key={url} src={url} alt="" className="w-24 h-24 rounded-frame object-cover shrink-0" loading="lazy" />
            ))}
          </div>
        </div>

        <div className="mt-6 frame p-4">
          <p className="eyebrow">Community vouchers</p>
          {artisan.vouchers.length === 0 ? (
            <p className="italic-serif text-sm text-slate mt-2">No vouchers yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {artisan.vouchers.map((v) => (
                <li key={v.id} className="text-sm text-ink">
                  Vouched by <strong>{v.fromName}</strong> · {v.fromRole}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 frame p-4">
          <p className="text-sm text-ink">
            {artisan.name.split(' ')[0]} is a {tier} Steward.
            {next.jobsNeeded > 0 && ` ${next.jobsNeeded} more clean jobs to become a Steward.`}
          </p>
          <ProgressBar value={progress} className="mt-3" />
        </div>

        <div className="mt-6 frame p-4">
          <p className="mono-tag">Price guide</p>
          <p className="text-sm text-slate mt-2">
            Generator diagnosis from {formatNaira(800_000)} · Full repair {formatNaira(1_500_000)}–{formatNaira(2_500_000)}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-1 text-sm text-slate">
          <FaStar className="text-gilt" aria-hidden />
          <span>4.8 average from 28 reviews</span>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto z-30">
        <Link to={`/resident/book/${artisan.id}`}>
          <Button className="w-full">Request a quote</Button>
        </Link>
      </div>
    </div>
  )
}
