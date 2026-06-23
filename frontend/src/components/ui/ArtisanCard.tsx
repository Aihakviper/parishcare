import { Link } from 'react-router-dom'
import { IconStar } from '../../lib/icons'
import type { Artisan } from '../../lib/types/camp'
import { TRADE_LABELS } from '../../lib/types/camp'
import { TierPill } from './TierPill'
import { Card } from './Card'
import { cn } from '../../lib/cn'

export function ArtisanCard({
  artisan,
  to,
  compact,
}: {
  artisan: Artisan
  to: string
  compact?: boolean
}) {
  const tier =
    artisan.tier === 'unverified' ? 'verified' : artisan.tier

  return (
    <Link to={to} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt rounded-frame">
      <Card className={cn('flex gap-3', compact && 'p-3')}>
        <img
          src={artisan.photoUrl ?? artisan.workPhotos[0]}
          alt=""
          className="w-14 h-14 rounded-frame object-cover shrink-0 bg-parchment-soft"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-ink truncate">{artisan.name}</p>
            <TierPill tier={tier} jobsCompleted={artisan.completedJobs} />
          </div>
          <p className="text-sm text-slate mt-0.5">
            {TRADE_LABELS[artisan.trade]} · {artisan.distanceKm?.toFixed(1) ?? '—'} km
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate">
            <span className="inline-flex items-center gap-0.5 text-ink font-medium">
              <IconStar className="text-gilt w-3 h-3" aria-hidden />
              {artisan.averageRating.toFixed(1)}
            </span>
            {artisan.availableNow ? (
              <span className="inline-flex items-center gap-1 text-verdigris">
                <span className="w-1.5 h-1.5 rounded-full bg-verdigris" aria-hidden />
                Available now
              </span>
            ) : (
              <span>Active in {artisan.responseMinutes ?? 60} min</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
