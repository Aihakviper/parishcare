import type { IconType } from 'react-icons'
import { cn } from '../../lib/cn'

export interface PersonaCardProps {
  role: string
  icon: IconType
  iconTone: string
  name: string
  subtitle: string
  story: string
  benefits: readonly string[]
  className?: string
}

export function PersonaCard({
  role,
  icon: Icon,
  iconTone,
  name,
  subtitle,
  story,
  benefits,
  className,
}: PersonaCardProps) {
  return (
    <article className={cn('persona-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className={cn('persona-icon', iconTone)} aria-hidden>
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-xs font-medium text-slate">{role}</span>
      </div>

      <h3 className="display-tight text-2xl font-semibold text-ink mt-6 leading-tight">{name}</h3>
      <p className="text-sm text-slate mt-1">{subtitle}</p>
      <p className="text-sm text-ink/85 mt-4 leading-relaxed">{story}</p>

      <div className="persona-value mt-6">
        <p className="persona-value-label">What Steward gives them</p>
        <p className="text-sm text-ink/90 mt-2 leading-relaxed">{benefits.join(' ')}</p>
      </div>
    </article>
  )
}
