import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { usePatterns } from '../../hooks/useCampData'

export function ConsolePatterns() {
  const { data: patterns = [] } = usePatterns()

  return (
    <div>
      <RomanSection index={4} title="PATTERNS" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Steward insights</h1>
      <p className="text-slate mt-2 max-w-xl">
        Plain-English observations from job data across the Camp.
      </p>

      <div className="mt-8 space-y-4">
        {patterns.map((p) => (
          <article key={p.id} className="frame p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mono-tag capitalize">{p.status}</p>
                <h2 className="display-tight text-lg font-semibold text-ink mt-1">{p.title}</h2>
                <p className="text-sm text-slate mt-2 leading-relaxed">{p.explanation}</p>
                <p className="text-sm text-ink mt-3">
                  <span className="font-semibold">Suggested: </span>
                  {p.suggestedAction}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="text-xs px-3 py-2 min-h-[36px]">Acknowledged</Button>
              <Button variant="ghost" className="text-xs px-3 py-2 min-h-[36px]">Dismiss</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
