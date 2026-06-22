import { cn } from '../../lib/cn'

type Tone = 'default' | 'success' | 'warning' | 'accent'

const tones: Record<Tone, string> = {
  default: 'border-hairline text-slate bg-parchment-soft',
  success: 'border-verdigris/30 text-verdigris bg-verdigris/5',
  warning: 'border-gilt/40 text-gilt bg-gilt/10',
  accent: 'border-seafoam/30 text-verdigris bg-verdigris-light',
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded-sm',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
