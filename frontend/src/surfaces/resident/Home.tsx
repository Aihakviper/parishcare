import { RomanSection } from '../../components/ui/RomanSection'
import { Card } from '../../components/ui/Card'

export function ResidentHome() {
  return (
    <div>
      <RomanSection index={0} title="GOOD MORNING, FUNMI" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">
        Find a Trusted Steward
      </h1>
      <p className="text-slate text-sm mt-2 leading-relaxed">
        Resident app surfaces land in PROMPT 3. Search, categories, and trusted artisans
        will live here.
      </p>
      <Card className="mt-6">
        <p className="mono-tag">Scaffold</p>
        <p className="italic-serif text-slate text-sm mt-2">
          Nearby and ready — generator tech, plumbers, electricians.
        </p>
      </Card>
    </div>
  )
}
