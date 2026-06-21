import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatNaira } from '../../../lib/formatters'
import { PAGE_TRANSITION } from '../../../lib/motion'
import type { ParishAggregate } from '../../../lib/provincial/aggregates'
import { strainedNote } from '../../../lib/provincial/aggregates'
import { EmptyState } from '../../../components/ui/EmptyState'
import { cn } from '../../../lib/cn'

interface GraceMapProps {
  parishes: ParishAggregate[]
  maxDisbursed: number
}

export function GraceMap({ parishes, maxDisbursed }: GraceMapProps) {
  const reduceMotion = useReducedMotion()
  const allowBarAnimation = useRef(!reduceMotion)

  useEffect(() => {
    allowBarAnimation.current = false
  }, [])

  if (parishes.length === 0) {
    return (
      <div className="frame p-4 sm:p-5">
        <EmptyState>No families nearby unreached. Rare and good.</EmptyState>
      </div>
    )
  }

  return (
    <div className="frame p-4 sm:p-5">
      <p className="eyebrow mb-4">The grace map</p>
      <ul className="space-y-4">
        {parishes.map((parish, i) => {
          const widthPct = Math.max(
            4,
            Math.round((parish.disbursedKobo / maxDisbursed) * 100),
          )
          const note = strainedNote(parish)

          return (
            <li key={parish.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                <span
                  className={cn(
                    'text-sm font-medium',
                    parish.strained ? 'text-oxblood' : 'text-ink',
                  )}
                >
                  {parish.name.replace(/^RCCG\s*/, '')}
                </span>
                <span className="mono-tag text-[0.6rem]">
                  {parish.casesThisMonth} cases · {formatNaira(parish.disbursedKobo)}
                </span>
              </div>
              <div className="h-2 bg-hairline rounded-sm overflow-hidden" role="presentation">
                <motion.div
                  className={cn(
                    'h-full rounded-sm',
                    parish.strained ? 'bg-oxblood' : 'bg-verdigris',
                  )}
                  initial={
                    allowBarAnimation.current ? { width: 0 } : { width: `${widthPct}%` }
                  }
                  animate={{ width: `${widthPct}%` }}
                  transition={{
                    ...PAGE_TRANSITION,
                    delay: allowBarAnimation.current ? i * 0.04 : 0,
                  }}
                />
              </div>
              {note && (
                <p className="italic-serif text-xs text-oxblood mt-2">{note}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
