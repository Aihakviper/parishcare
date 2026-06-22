import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { useArtisan, useJobMutations, HERO_IDS } from '../../hooks/useCampData'
import { formatNaira } from '../../lib/formatters'

export function ResidentBookJob() {
  const { artisanId } = useParams()
  const navigate = useNavigate()
  const { data: artisan } = useArtisan(artisanId)
  const { createJob, fundEscrow } = useJobMutations()
  const [step, setStep] = useState(1)
  const [description, setDescription] = useState(
    'Generator no dey start. Service Sunday is in 6 hours.',
  )
  const [timing, setTiming] = useState('asap')
  const [priceKobo, setPriceKobo] = useState(1_850_000)
  const [loading, setLoading] = useState(false)

  if (!artisan) return <p className="italic-serif text-slate py-12">Loading…</p>

  const handleBook = async () => {
    setLoading(true)
    try {
      const job = await createJob.mutateAsync({
        residentId: HERO_IDS.residentId,
        artisanId: artisan.id,
        trade: artisan.trade,
        description,
        priceKobo,
      })
      await fundEscrow.mutateAsync(job.id)
      navigate(`/resident/jobs/${job.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-8">
      <RomanSection index={3} title={`BOOK · STEP ${step} OF 4`} />
      <h1 className="display-tight text-xl font-semibold text-ink mt-2">
        Book {artisan.name.split(' ')[0]}
      </h1>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate">Describe the problem — tap and speak, or type below.</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-frame border border-hairline p-3 bg-bone text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gilt"
          />
          <Button onClick={() => setStep(2)} className="w-full">Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-3">
          {['As soon as possible', 'Within today', 'Tomorrow'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setTiming(opt)
                setStep(3)
              }}
              className={`w-full text-left frame p-4 hover:shadow-lift transition-shadow ${
                timing === opt ? 'ring-2 ring-oxblood/30' : ''
              }`}
            >
              <p className="font-semibold text-ink">{opt}</p>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-4">
          <p className="italic-serif text-slate text-sm">
            Comparable jobs paid {formatNaira(1_600_000)} – {formatNaira(2_200_000)}
          </p>
          <label className="block">
            <span className="mono-tag">Your offer (₦)</span>
            <input
              type="number"
              value={priceKobo / 100}
              onChange={(e) => setPriceKobo(Number(e.target.value) * 100)}
              className="mt-2 w-full rounded-frame border border-hairline p-3 bg-bone"
            />
          </label>
          <Button onClick={() => setStep(4)} className="w-full">Review</Button>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-4">
          <div className="frame p-4 space-y-2 text-sm">
            <p><span className="text-slate">Artisan:</span> {artisan.name}</p>
            <p><span className="text-slate">Problem:</span> {description}</p>
            <p><span className="text-slate">When:</span> {timing}</p>
            <p><span className="text-slate">Price:</span> {formatNaira(priceKobo)}</p>
          </div>
          <p className="text-sm text-slate leading-relaxed">
            By confirming, {formatNaira(priceKobo)} will be held in Steward escrow. It is released
            to {artisan.name.split(' ')[0]} only when you confirm the job is done well.
          </p>
          <p className="mono-tag text-xs">
            Steward&apos;s 5% service fee ({formatNaira(Math.round(priceKobo * 0.05))}) protects this transaction.
          </p>
          <Button onClick={handleBook} disabled={loading} className="w-full">
            {loading ? 'Funding escrow…' : 'Fund escrow & book'}
          </Button>
        </div>
      )}
    </div>
  )
}
