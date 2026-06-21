import logo from '../../assets/steward-logo.png'
import { cn } from '../../lib/cn'

/** RCCG handshake mark — stewardship & partnership. */
export function StewardMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt=""
      className={cn('h-9 w-9 object-contain', className)}
      width={36}
      height={36}
      aria-hidden
    />
  )
}
