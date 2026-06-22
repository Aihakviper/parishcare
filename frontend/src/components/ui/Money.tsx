import { formatNaira } from '../../lib/formatters'
import { EyebrowLabel } from './EyebrowLabel'
import { cn } from '../../lib/cn'

export function Money({
  kobo,
  label,
  size = 'md',
  className,
}: {
  kobo: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div className={className}>
      {label && <EyebrowLabel>{label}</EyebrowLabel>}
      <p className={cn('display-tight font-semibold text-ink mt-1', sizes[size])}>
        {formatNaira(kobo)}
      </p>
    </div>
  )
}
