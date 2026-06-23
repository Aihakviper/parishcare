import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { useJobMutations, useCampSession } from '../../hooks/useCampData'

export function ArtisanMentorEnroll() {
  const navigate = useNavigate()
  const { artisanId } = useCampSession()
  const { enrollMentor } = useJobMutations()
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!artisanId) return
    await enrollMentor.mutateAsync({ artisanId, trade: 'generator_tech' })
    setDone(true)
    setTimeout(() => navigate('/artisan/apprenticeship'), 1500)
  }

  return (
    <div>
      <RomanSection index={3} title="MENTOR" />
      <h1 className="display-tight text-xl font-semibold text-ink mt-3">I want to mentor</h1>
      <p className="text-slate text-sm mt-2">
        Parish leadership reviews mentor enrollments. Emeka started this way.
      </p>
      {done ? (
        <p className="italic-serif text-verdigris mt-8">Submitted. Pastor Adekunle will confirm standing.</p>
      ) : (
        <Button onClick={submit} className="w-full mt-8" disabled={!artisanId}>
          Submit enrollment
        </Button>
      )}
    </div>
  )
}
