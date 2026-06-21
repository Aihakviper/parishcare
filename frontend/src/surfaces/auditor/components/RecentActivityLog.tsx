import { motion } from 'framer-motion'
import type { AuditDisplayEntry } from '../../../lib/auditor/present'
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
      <div
        className="p-4 sm:p-5 bg-ink/[0.02] overflow-x-auto"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
      >
        <pre className="text-[0.72rem] sm:text-[0.75rem] leading-relaxed text-ink m-0">
          {recent.map((entry, index) => (
            <motion.div
              key={entry.id}
              className="whitespace-pre"
              animate={
                chainPulse && index === 0
                  ? {
                      backgroundColor: [
                        'rgba(45, 85, 68, 0)',
                        'rgba(45, 85, 68, 0.12)',
                        'rgba(45, 85, 68, 0)',
                      ],
                    }
                  : undefined
              }
              transition={
                chainPulse && index === 0
                  ? { duration: 1.4, repeat: 3, ease: 'easeInOut' }
                  : undefined
              }
            >
              <span className="text-verdigris">✓</span>
              {'  '}
              <span className="text-slate">{entry.hashShort}</span>
              {'  '}
              <span className="text-ink">{padType(entry.entryType)}</span>
              <span>{entry.detail}</span>
              {'  '}
              <span className="text-slate">{entry.timeAgo}</span>
            </motion.div>
          ))}
        </pre>
        {recent.length === 0 && (
          <p className="font-mono text-xs text-slate">No chain entries yet.</p>
        )}
      </div>
    </section>
  )
}
