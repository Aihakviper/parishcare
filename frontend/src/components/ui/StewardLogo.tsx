import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { StewardMark } from './StewardMark'

type StewardLogoProps = {
  className?: string
  markSize?: number
  showWordmark?: boolean
  to?: string
}

export function StewardLogo({
  className,
  markSize = 32,
  showWordmark = true,
  to,
}: StewardLogoProps) {
  const content = (
    <>
      <StewardMark size={markSize} />
      {showWordmark && (
        <span className="display-tight text-lg font-semibold text-ink tracking-tight">
          Steward
        </span>
      )}
    </>
  )

  const classes = cn('inline-flex items-center gap-2.5', className)

  if (to) {
    return (
      <Link to={to} className={classes} aria-label="Steward home">
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
