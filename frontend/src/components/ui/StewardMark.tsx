import { cn } from '../../lib/cn'

type StewardMarkProps = {
  className?: string
  size?: number
}

/** Steward shield logomark — trust badge with check */
export function StewardMark({ className, size = 32 }: StewardMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Steward"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-oxblood" />
      <path
        d="M16 7.5 22.5 10.75V16.25c0 4.35-3.9 7.15-6.5 8.25-2.6-1.1-6.5-3.9-6.5-8.25v-5.5L16 7.5Z"
        fill="#F5F0E5"
      />
      <path
        d="M12.75 15.75 14.85 17.85 19.25 13.45"
        stroke="#2D5544"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
