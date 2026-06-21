import type { ProvincialPattern } from '../../../lib/provincial/aggregates'
import { EmptyState } from '../../../components/ui/EmptyState'

interface PatternsPanelProps {
  patterns: ProvincialPattern[]
}

export function PatternsPanel({ patterns }: PatternsPanelProps) {
  return (
    <div className="frame p-4 sm:p-5 h-full">
      <p className="eyebrow mb-4">What Steward is noticing</p>
      {patterns.length === 0 ? (
        <EmptyState className="py-8 text-base">
          No patterns flagged yet. The province is moving steadily.
        </EmptyState>
      ) : (
        <ul className="space-y-5">
          {patterns.map((p) => (
            <li key={p.id} className="border-b border-hairline/60 pb-4 last:border-0">
              <p className="italic-serif text-sm text-slate leading-relaxed">{p.text}</p>
              <button
                type="button"
                className="text-xs text-oxblood font-medium mt-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
                onClick={() => {}}
              >
                → Open the data
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
