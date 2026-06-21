import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { AuditDisplayEntry } from '../../../lib/auditor/present'
import { formatAuditDate } from '../../../lib/auditor/present'
import { cn } from '../../../lib/cn'

interface ChainHealthPanelProps {
  entries: AuditDisplayEntry[]
}

function blockColor(type: AuditDisplayEntry['entryType']): string {
  switch (type) {
    case 'disbursement':
      return 'bg-verdigris'
    case 'approval':
      return 'bg-verdigris/90'
    case 'voucher':
      return 'bg-gilt'
    case 'verification':
      return 'bg-verdigris/75'
    case 'escalation':
      return 'bg-oxblood/60'
    case 'rejection':
      return 'bg-oxblood/40'
    default:
      return 'bg-verdigris/80'
  }
}

export function ChainHealthPanel({ entries }: ChainHealthPanelProps) {
  const [active, setActive] = useState<AuditDisplayEntry | null>(null)
  const blocks = entries.slice(-60)
  const earliest = entries[0]
  const latest = entries[entries.length - 1]

  return (
    <section className="frame p-5 sm:p-6">
      <h2 className="font-semibold text-ink text-sm mb-1">Chain health</h2>
      <p className="text-slate text-xs mb-5">Last {blocks.length} entries · linked hash sequence</p>

      <div className="relative">
        <div className="flex items-end gap-px overflow-x-auto pb-2 scrollbar-thin">
          {blocks.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              className={cn(
                'relative shrink-0 w-2.5 sm:w-3 rounded-sm transition-transform hover:scale-y-110 hover:z-10 focus:outline-none focus:ring-2 focus:ring-verdigris/50',
                blockColor(entry.entryType),
                i === blocks.length - 1 && 'ring-1 ring-verdigris ring-offset-1 ring-offset-bone',
              )}
              style={{ height: `${14 + (i % 5) * 2}px` }}
              onMouseEnter={() => setActive(entry)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(entry)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((prev) => (prev?.id === entry.id ? null : entry))}
              aria-label={`${entry.entryType} ${entry.hashShort}`}
            />
          ))}
        </div>

        {active && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 w-56 frame p-3 shadow-lg text-left"
            role="tooltip"
          >
            <p className="font-mono text-[0.65rem] text-ink break-all">{active.hashShort}</p>
            <p className="text-xs text-slate mt-1 capitalize">{active.entryType}</p>
            <p className="text-xs text-slate">{formatDistanceToNow(new Date(active.timestamp), { addSuffix: true })}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mt-5 pt-4 border-t border-hairline text-xs text-slate">
        <span>
          Earliest record · {earliest ? formatAuditDate(earliest.timestamp) : '—'}
        </span>
        <span>
          Latest record · {latest ? formatDistanceToNow(new Date(latest.timestamp), { addSuffix: true }) : '—'}
        </span>
      </div>
    </section>
  )
}
