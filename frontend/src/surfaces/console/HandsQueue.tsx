import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { useApprenticeships, usePastoralConfirmations } from '../../hooks/useCampData'

export function ConsoleHands() {
  const { data: apprenticeships = [] } = useApprenticeships()
  const { data: pastoral = [] } = usePastoralConfirmations()
  const mentorPending = pastoral.filter((p) => p.status === 'pending' && p.note?.includes('Mentor'))

  return (
    <div>
      <RomanSection index={1} title="HANDS IN TRAINING" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Apprentices & mentors</h1>
      <p className="text-slate text-sm mt-2">Every payment trains the next pair of hands.</p>

      {mentorPending.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow">Mentor enrollments</h2>
          <ul className="mt-3 space-y-2">
            {mentorPending.map((p) => (
              <li key={p.id} className="frame p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{p.subjectName}</p>
                  <p className="text-sm text-slate">{p.note}</p>
                </div>
                <Link to="/console/standing">
                  <Button variant="secondary" className="text-xs">Review standing</Button>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="eyebrow">Active apprenticeships</h2>
        {apprenticeships.length === 0 ? (
          <p className="italic-serif text-slate mt-4">No apprenticeships yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {apprenticeships.map((a) => (
              <li key={a.id} className="frame p-4">
                <p className="font-semibold text-ink">{a.apprenticeName}</p>
                <p className="text-sm text-slate">
                  Master ID: {a.masterArtisanId} · {a.monthsIn} months · {a.trade.replace('_', ' ')}
                </p>
                {a.supportedByMemberIds.length > 0 && (
                  <p className="mono-tag mt-2">{a.supportedByMemberIds.length} members supporting</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
