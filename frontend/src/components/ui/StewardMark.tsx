import logo from '../../assets/steward-logo.png'
import { cn } from '../../lib/cn'

type StewardMarkProps = {
  className?: string
  size?: number
}

/** RCCG handshake mark — stewardship, partnership, diligent hands. */
export function StewardMark({ className, size = 36 }: StewardMarkProps) {
  return (
    <img
      src={logo}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}
