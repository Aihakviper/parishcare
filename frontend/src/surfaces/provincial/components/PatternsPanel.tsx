import type { ProvincialPattern } from '../../../lib/provincial/aggregates'

interface PatternsPanelProps {
  patterns: ProvincialPattern[]
}

export function PatternsPanel({ patterns }: PatternsPanelProps) {
  return (
    <div className="frame p-4 sm:p-5 h-full">
      <p className="eyebrow mb-4">What Steward is noticing</p>
      <ul className="space-y-5">
        {patterns.map((p) => (
          <li key={p.id} className="border-b border-hairline/60 pb-4 last:border-0">
            <p className="italic-serif text-sm text-slate leading-relaxed">{p.text}</p>
            <button
              type="button"
              className="text-xs text-oxblood font-medium mt-2 hover:underline"
              onClick={() => {}}
            >
              → Open the data
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
