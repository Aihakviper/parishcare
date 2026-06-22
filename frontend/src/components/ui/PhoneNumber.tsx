import { formatPhone } from '../../lib/formatters'
import { cn } from '../../lib/cn'

export function PhoneNumber({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <span className={cn('font-mono text-sm text-ink tabular-nums', className)}>
      {formatPhone(value)}
    </span>
  )
}
