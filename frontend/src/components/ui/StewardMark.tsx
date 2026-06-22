import { cn } from '../../lib/cn'

/** Steward logomark — Fraunces "S" */
export function StewardMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'display-tight text-2xl font-semibold text-oxblood leading-none select-none',
        className,
      )}
      aria-hidden
    >
      S
    </span>
  )
}
