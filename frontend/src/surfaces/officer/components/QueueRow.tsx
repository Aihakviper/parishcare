import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../../lib/cn'
import { listItemVariants } from '../../../lib/motion'
import {
  needCategoryLabel,
  priorityBand,
  redactPhone,
  statusLabel,
  storyTagLine,
  timeAgo,
} from '../../../lib/officer/format'
import { formatNaira } from '../../../lib/formatters'
import type { CaseWithBeneficiary } from '../hooks/useOfficerCases'

interface QueueRowProps {
  item: CaseWithBeneficiary
}

const bandStyles = {
  high: 'bg-oxblood/10 text-oxblood border-oxblood/30',
  medium: 'bg-gilt/15 text-gilt border-gilt/40',
  low: 'bg-parchment-soft text-slate border-hairline',
}

export function QueueRow({ item }: QueueRowProps) {
  const navigate = useNavigate()
  const band = priorityBand(item.priorityScore)
  const { beneficiary } = item
  const knownBeneficiary =
    item.status !== 'pending' ||
    beneficiary.disbursementHistory.length > 0

  return (
    <motion.li variants={listItemVariants}>
      <button
        type="button"
        onClick={() => navigate(`/officer/case/${item.id}`)}
        className={cn(
          'w-full text-left bg-bone border border-hairline rounded-frame p-4 sm:p-5',
          'hover:border-gilt transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
        )}
      >
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="display text-[1.15rem] font-semibold text-ink leading-tight">
              {beneficiary.name}
            </p>
            <p className="font-mono text-xs text-slate mt-0.5">
              {redactPhone(beneficiary.phone)}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full border',
                  knownBeneficiary
                    ? 'bg-verdigris/10 text-verdigris border-verdigris/30'
                    : 'bg-gilt/10 text-gilt border-gilt/40',
                )}
              >
                {needCategoryLabel(item.needCategory)}
              </span>
            </div>

            <p className="italic-serif text-sm text-slate mt-2">
              {storyTagLine(beneficiary.storyTag, beneficiary.dependents)}
            </p>

            <p className="mono-tag mt-3 normal-case tracking-normal">
              {formatNaira(item.amountRequestedKobo)} requested · {timeAgo(item.createdAt)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={cn(
                'text-sm font-bold tabular-nums px-2.5 py-1 rounded-full border',
                bandStyles[band],
              )}
              aria-label={`Priority ${item.priorityScore}`}
            >
              {item.priorityScore}
            </span>
            <span className="text-xs font-medium text-slate px-2 py-0.5 border border-hairline rounded-sm bg-parchment-soft">
              {statusLabel(item.status)}
            </span>
          </div>
        </div>
      </button>
    </motion.li>
  )
}
