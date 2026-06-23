import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaStar } from 'react-icons/fa6'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { useJobMutations } from '../../hooks/useCampData'

export function ResidentJobReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { submitReview } = useJobMutations()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [trusted, setTrusted] = useState(true)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!id) return
    await submitReview.mutateAsync({ id, rating, text })
    setDone(true)
    setTimeout(() => navigate('/member'), 1500)
  }

  if (done) {
    return (
      <p className="italic-serif text-center text-verdigris py-16 text-lg">
        Thank you, Funmi. Tunde is one step closer to Steward.
      </p>
    )
  }

  return (
    <div>
      <RomanSection index={4} title="REVIEW" />
      <h1 className="display-tight text-xl font-semibold text-ink mt-3">How did Tunde do?</h1>

      <div className="flex gap-2 mt-6 justify-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className="p-2 min-h-[44px] min-w-[44px]"
            aria-label={`Rate ${n} stars`}
          >
            <FaStar className={`w-8 h-8 ${n <= rating ? 'text-gilt' : 'text-hairline'}`} />
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a few words (optional)"
        rows={3}
        className="mt-6 w-full rounded-frame border border-hairline p-3 bg-bone"
      />

      <label className="mt-4 flex items-center gap-2 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={trusted}
          onChange={(e) => setTrusted(e.target.checked)}
          className="w-4 h-4 accent-oxblood"
        />
        Add Tunde to my trusted Stewards
      </label>

      <Button onClick={handleSubmit} className="w-full mt-8">
        Submit review
      </Button>
    </div>
  )
}
