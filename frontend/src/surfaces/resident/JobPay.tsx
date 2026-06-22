import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { useJob, useArtisan, useJobMutations } from '../../hooks/useCampData'
import { formatNaira } from '../../lib/formatters'

export function ResidentJobPay() {
  const { id } = useParams()
  const { data: job } = useJob(id)
  const { data: artisan } = useArtisan(job?.artisanId)
  const { releaseEscrow } = useJobMutations()
  const [released, setReleased] = useState(false)
  const [animating, setAnimating] = useState(false)

  if (!job || !artisan) return <p className="italic-serif text-slate py-12">Loading…</p>

  const fee = Math.round(job.priceKobo * 0.05)
  const net = job.priceKobo - fee

  const handleRelease = async () => {
    setAnimating(true)
    await new Promise((r) => setTimeout(r, 700))
    await releaseEscrow.mutateAsync(job.id)
    setReleased(true)
    setAnimating(false)
  }

  if (released || job.escrowStatus === 'released') {
    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="frame p-8 max-w-sm mx-auto"
        >
          <p className="display-tight text-2xl font-semibold text-verdigris">Payment released</p>
          <p className="text-ink mt-4">
            {formatNaira(net)} released to {artisan.name}.
          </p>
          <p className="text-sm text-slate mt-2">
            Steward&apos;s 5% service fee: {formatNaira(fee)}
          </p>
          <p className="mono-tag mt-4">{job.releaseRef ?? 'STW-RLS-2026-001847'}</p>
          <Link to={`/resident/jobs/${job.id}/review`}>
            <Button className="w-full mt-6">Leave a review</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <RomanSection index={3} title="CONFIRM WORK" />
      <h1 className="display-tight text-xl font-semibold text-ink mt-3">
        {artisan.name.split(' ')[0]} says the work is complete.
      </h1>

      <div className="grid grid-cols-3 gap-2 mt-6">
        {(['before', 'during', 'after'] as const).map((key) => (
          <div key={key} className="aspect-square rounded-frame bg-parchment-soft overflow-hidden">
            {job.photos[key] ? (
              <img src={job.photos[key]} alt={key} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center mono-tag text-[0.55rem]">
                {key}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="display-tight text-lg font-semibold text-ink mt-8">Is the job done well?</p>

      {animating ? (
        <motion.div
          className="mt-6 frame p-6 flex items-center justify-between gap-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.5 }}
        >
          <div className="frame p-4 flex-1 text-center">
            <p className="mono-tag">Held</p>
            <p className="font-semibold text-ink">{formatNaira(job.priceKobo)}</p>
          </div>
          <motion.span
            animate={{ x: [0, 40, 80] }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            className="text-gilt text-2xl"
          >
            →
          </motion.span>
          <div className="frame p-4 flex-1 text-center border-verdigris/30">
            <p className="mono-tag">Tunde</p>
            <p className="font-semibold text-verdigris">{formatNaira(net)}</p>
          </div>
        </motion.div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={handleRelease} className="w-full">
            Yes, release payment
          </Button>
          <Button variant="ghost" className="w-full">
            Something is wrong
          </Button>
        </div>
      )}
    </div>
  )
}
