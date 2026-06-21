import type { AuditDisplayEntry } from '../../../lib/auditor/present'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useTourStore } from '../../../store/tour'

interface RecentActivityLogProps {
  entries: AuditDisplayEntry[]
}

function padType(type: string): string {
  return type.padEnd(13, ' ')
}

export function RecentActivityLog({ entries }: RecentActivityLogProps) {
  const chainPulse = useTourStore((s) => s.chainPulse)
  const recent = [...entries].reverse().slice(0, 10)

  return (
    <section className="frame overflow-hidden" data-tour="auditor-activity">
      <div className="frame-bar">
        <span className="font-mono text-xs text-slate uppercase tracking-wider">
          Recent activity · chain tail
        </span>
      </div>
      <div className="p-4 sm:p-5 bg-ink/[0.02] overflow-x-auto">
        {recent.length === 0 ? (
          <EmptyState className="py-8 text-base">The chain is whole.</EmptyState>
        ) : (
          <ul
            className="text-[0.72rem] sm:text-[0.75rem] leading-relaxed text-ink m-0 p-0 list-none"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            aria-label="Recent audit chain entries"
          >
            {recent.map((entry, index) => (
              <li
                key={entry.id}
                className={
                  chainPulse && index === 0
                    ? 'bg-verdigris/10 rounded-sm -mx-1 px-1 transition-colors duration-700'
                    : 'whitespace-pre'
                }
              >
                <span className="text-verdigris" aria-hidden>
                  ✓
                </span>
                {'  '}
                <span className="text-slate">{entry.hashShort}</span>
                {'  '}
                <span className="text-ink">{padType(entry.entryType)}</span>
                <span>{entry.detail}</span>
                {'  '}
                <span className="text-slate">{entry.timeAgo}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
