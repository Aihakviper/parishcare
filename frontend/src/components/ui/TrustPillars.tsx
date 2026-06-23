import type { PillarBreakdown } from '../../lib/types/camp'
import { cn } from '../../lib/cn'

const LABELS: { key: keyof PillarBreakdown; label: string }[] = [
  { key: 'identity', label: 'Identity' },
  { key: 'vouch', label: 'Vouch' },
  { key: 'proof', label: 'Proof' },
  { key: 'generosity', label: 'Generosity' },
  { key: 'standing', label: 'Standing' },
]

export function TrustPillars({
  pillars,
  className,
}: {
  pillars: PillarBreakdown
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {LABELS.map(({ key, label }) => {
        const score = pillars[key]
        const lit = score >= 12
        return (
          <span
            key={key}
            className={cn(
              'px-2 py-1 rounded-full text-[0.65rem] font-semibold border',
              lit
                ? 'bg-verdigris/10 text-verdigris border-verdigris/30'
                : 'bg-parchment-soft text-slate border-hairline',
            )}
            title={`${label}: ${score}/20`}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
