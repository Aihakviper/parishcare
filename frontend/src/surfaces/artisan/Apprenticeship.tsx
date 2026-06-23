import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { useApprenticeships } from '../../hooks/useCampData'
import { HERO_IDS } from '../../hooks/useCampData'
import { formatNaira } from '../../lib/formatters'

export function ArtisanApprenticeship() {
  const { data: list = [] } = useApprenticeships({ masterId: HERO_IDS.artisanId })

  return (
    <div>
      <RomanSection index={2} title="APPRENTICESHIP" />
      <h1 className="display-tight text-xl font-semibold text-ink mt-3">Hands you are training</h1>
      {list.length === 0 ? (
        <p className="italic-serif text-slate py-8">No apprentices yet. Enroll to mentor from your profile.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((a) => (
            <li key={a.id} className="frame p-4">
              <p className="font-semibold text-ink">{a.apprenticeName}</p>
              <p className="text-sm text-slate capitalize">{a.trade.replace('_', ' ')} · {a.monthsIn} months</p>
              {a.stipendKoboRequested && (
                <p className="mono-tag mt-2">Stipend requested: {formatNaira(a.stipendKoboRequested)}</p>
              )}
              <Button variant="secondary" className="w-full mt-3 text-xs">
                Log training session
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/artisan/mentor" className="block mt-6">
        <Button variant="ghost" className="w-full">I want to mentor another</Button>
      </Link>
    </div>
  )
}
