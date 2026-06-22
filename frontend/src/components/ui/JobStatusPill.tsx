import type { JobStatus } from '../../lib/types/camp'
import { cn } from '../../lib/cn'

const labels: Record<JobStatus, string> = {
  requested: 'Requested',
  quoted: 'Quoted',
  accepted: 'Accepted',
  en_route: 'En route',
  working: 'Working',
  completed: 'Complete',
  disputed: 'Disputed',
  closed: 'Closed',
}

const tones: Record<JobStatus, string> = {
  requested: 'bg-slate/10 text-slate',
  quoted: 'bg-gilt/15 text-ink',
  accepted: 'bg-oxblood/10 text-oxblood',
  en_route: 'bg-oxblood/10 text-oxblood',
  working: 'bg-verdigris/10 text-verdigris',
  completed: 'bg-verdigris/10 text-verdigris',
  disputed: 'bg-oxblood/15 text-oxblood',
  closed: 'bg-slate/10 text-slate',
}

export function JobStatusPill({
  status,
  pulse,
  className,
}: {
  status: JobStatus
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        tones[status],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verdigris opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-verdigris" />
        </span>
      )}
      {labels[status]}
    </span>
  )
}
