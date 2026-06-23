import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RomanSection } from '../../components/ui/RomanSection'
import { BayoOrb } from '../../components/voice/BayoOrb'
import { TierPill } from '../../components/ui/TierPill'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useJobs, useArtisan, useCampSession } from '../../hooks/useCampData'
import { formatNaira } from '../../lib/formatters'
import { useVoiceStore } from '../../store/voice'
import { LIST_ITEM, LIST_STAGGER } from '../../lib/motion'
import { TRADE_LABELS } from '../../lib/types/camp'

export function ArtisanHome() {
  const openPanel = useVoiceStore((s) => s.openPanel)
  const { artisanId, activeJobId } = useCampSession()
  const { data: jobs = [] } = useJobs(
    artisanId ? { artisanId, status: 'requested' } : {},
  )
  const { data: allJobs = [] } = useJobs(artisanId ? { artisanId } : {})
  const { data: artisan } = useArtisan(artisanId ?? undefined)

  const heroJob =
    allJobs.find((j) => j.isHero) ??
    allJobs.find((j) => activeJobId && j.id === activeJobId) ??
    allJobs[0]
  const feed = heroJob ? [heroJob, ...jobs.filter((j) => j.id !== heroJob.id)] : jobs
  const pendingEscrow = allJobs
    .filter((j) => j.escrowStatus === 'held')
    .reduce((s, j) => s + j.priceKobo, 0)

  return (
    <div>
      <RomanSection index={0} title={`BAYO READY · TRUSTED ${artisan?.name.split(' ')[0]?.toUpperCase() ?? 'ARTISAN'}`} />

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="frame p-2">
          <p className="mono-tag text-[0.55rem]">Pending</p>
          <p className="text-sm font-semibold text-ink">{formatNaira(pendingEscrow)}</p>
        </div>
        <div className="frame p-2">
          <p className="mono-tag text-[0.55rem]">This week</p>
          <p className="text-sm font-semibold text-ink">4 jobs</p>
        </div>
        <div className="frame p-2 flex flex-col items-center justify-center">
          <TierPill tier="trusted" jobsCompleted={31} />
        </div>
      </div>

      <button
        type="button"
        onClick={openPanel}
        className="mt-6 w-full frame p-6 flex flex-col items-center gap-3 hover:shadow-lift transition-shadow"
      >
        <BayoOrb />
        <p className="font-semibold text-ink">Tap to talk to Bayo</p>
        <p className="italic-serif text-slate text-sm text-center">
          I read your last job to you 2 minutes ago
        </p>
      </button>

      <h2 className="eyebrow mt-8">Inbound requests</h2>

      {feed.length === 0 ? (
        <p className="italic-serif text-slate text-center py-8">No new jobs today. Rest well.</p>
      ) : (
        <motion.ul className="mt-3 space-y-3" variants={LIST_STAGGER} initial="hidden" animate="show">
          {feed.map((job) => (
            <motion.li key={job.id} variants={LIST_ITEM}>
              <Card className={job.isHero ? 'ring-2 ring-gilt/50' : undefined}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="mono-tag">{TRADE_LABELS[job.trade]}</p>
                    <p className="font-semibold text-ink mt-1">
                      {job.isHero ? 'Funmi A.' : 'Resident'} · Phase 2
                    </p>
                    <p className="text-sm text-slate mt-1 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-slate mt-1">0.8 km · {formatNaira(job.priceKobo)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openPanel}
                  className="mono-tag text-oxblood mt-2 hover:underline"
                >
                  Bayo can read this aloud
                </button>
                <div className="flex gap-2 mt-3">
                  <Button variant="ghost" className="flex-1 text-xs px-2">Decline</Button>
                  <Link to={`/artisan/jobs/${job.id}`} className="flex-1">
                    <Button className="w-full text-xs px-2">
                      Accept {formatNaira(job.priceKobo)}
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
