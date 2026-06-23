import type { IconType } from 'react-icons'
import { IconCheck, IconClock, IconLock, IconUndo } from '../../lib/icons'
import type { EscrowStatus } from '../../lib/types/camp'
import { formatNaira } from '../../lib/formatters'
import { cn } from '../../lib/cn'

const config: Record<
  EscrowStatus,
  { label: string; icon: IconType; className: string }
> = {
  pending: {
    label: 'Awaiting payment',
    icon: IconClock,
    className: 'bg-slate/10 text-slate border-slate/30',
  },
  held: {
    label: 'held in escrow',
    icon: IconLock,
    className: 'bg-gilt/15 text-ink border-gilt/40',
  },
  released: {
    label: 'released',
    icon: IconCheck,
    className: 'bg-verdigris/10 text-verdigris border-verdigris/30',
  },
  refunded: {
    label: 'refunded',
    icon: IconUndo,
    className: 'bg-oxblood/10 text-oxblood border-oxblood/30',
  },
}

export function EscrowBadge({
  status,
  amountKobo,
  reference,
  recipient,
  className,
}: {
  status: EscrowStatus
  amountKobo: number
  reference?: string
  recipient?: string
  className?: string
}) {
  const { label, icon: Icon, className: tone } = config[status]
  const text =
    status === 'released' && recipient
      ? `${formatNaira(amountKobo)} released to ${recipient}`
      : `${formatNaira(amountKobo)} ${label}`

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold',
        tone,
        className,
      )}
      title={reference}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
      {reference && (
        <span className="font-mono text-[0.6rem] opacity-70 hidden sm:inline">
          {reference}
        </span>
      )}
    </div>
  )
}
