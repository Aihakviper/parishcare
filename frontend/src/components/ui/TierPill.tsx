import { cn } from '../../lib/cn'

export type TrustTier = 'verified' | 'trusted' | 'steward'

const tierClass: Record<TrustTier, string> = {
  verified: 'tier-verified',
  trusted: 'tier-trusted',
  steward: 'tier-steward',
}

const tierLabel: Record<TrustTier, string> = {
  verified: 'Verified',
  trusted: 'Trusted',
  steward: 'Steward',
}

export function TierPill({
  tier,
  jobsCompleted,
  className,
}: {
  tier: TrustTier
  jobsCompleted?: number
  className?: string
}) {
  const aria =
    jobsCompleted != null
      ? `${tierLabel[tier]}, ${jobsCompleted} jobs completed`
      : tierLabel[tier]

  return (
    <span className={cn(tierClass[tier], className)} aria-label={aria}>
      {tierLabel[tier]}
    </span>
  )
}
