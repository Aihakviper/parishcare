import { RomanSection } from '../../components/ui/RomanSection'
import { Card } from '../../components/ui/Card'

export function ConsoleOverview() {
  return (
    <div>
      <RomanSection index={0} title="THIS WEEK AT THE CAMP" />
      <h1 className="display-tight text-3xl font-semibold text-ink mt-3">
        The body is at work.
      </h1>
      <p className="text-slate mt-2 max-w-xl">
        Camp Console dashboards, disputes, and patterns ship in PROMPT 5.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {['Jobs completed', 'Active artisans', 'Disputes pending'].map((label) => (
          <Card key={label} hover={false}>
            <p className="mono-tag">{label}</p>
            <p className="display-tight text-3xl font-semibold text-ink mt-2">—</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
