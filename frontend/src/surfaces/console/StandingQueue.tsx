import { useState } from 'react'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { usePastoralConfirmations, useJobMutations } from '../../hooks/useCampData'

export function ConsoleStanding() {
  const { data: list = [] } = usePastoralConfirmations()
  const { confirmStanding } = useJobMutations()
  const [confirming, setConfirming] = useState<string | null>(null)

  const pending = list.filter((c) => c.status === 'pending')
  const confirmed = list.filter((c) => c.status === 'confirmed')

  const handleConfirm = async (id: string) => {
    setConfirming(id)
    await confirmStanding.mutateAsync({ id, note: 'Standing confirmed by Pastor Adekunle.' })
    setConfirming(null)
  }

  return (
    <div>
      <RomanSection index={2} title="STANDING QUEUE" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Pastoral confirmations</h1>
      <p className="text-slate text-sm mt-2">Identity and mentor enrollments await your word.</p>

      <section className="mt-8">
        <h2 className="eyebrow">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="italic-serif text-slate mt-4">Queue clear. Praise God.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((c) => (
              <li key={c.id} className="frame p-4">
                <p className="font-semibold text-ink">{c.subjectName}</p>
                <p className="text-sm text-slate capitalize">{c.subjectType} · {c.note}</p>
                <Button
                  className="w-full sm:w-auto mt-3"
                  disabled={confirming === c.id}
                  onClick={() => handleConfirm(c.id)}
                >
                  {confirming === c.id ? 'Confirming…' : 'Confirm standing'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmed.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">Recently confirmed</h2>
          <ul className="mt-3 space-y-2">
            {confirmed.slice(0, 5).map((c) => (
              <li key={c.id} className="text-sm text-slate">
                {c.subjectName} — {c.note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
