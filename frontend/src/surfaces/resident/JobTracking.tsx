import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { FaPlay } from 'react-icons/fa6'
import { RomanSection } from '../../components/ui/RomanSection'
import { JobStatusPill } from '../../components/ui/JobStatusPill'
import { EscrowBadge } from '../../components/ui/EscrowBadge'
import { Button } from '../../components/ui/Button'
import { useJob, useArtisan } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'

export function ResidentJobTracking() {
  const { id } = useParams()
  const { data: job } = useJob(id)
  const { data: artisan } = useArtisan(job?.artisanId)

  if (!job || !artisan) {
    return <p className="italic-serif text-slate py-12">Loading job…</p>
  }

  const statusLine =
    job.status === 'working'
      ? `${artisan.name.split(' ')[0]} is working on your generator`
      : job.status === 'en_route'
        ? `${artisan.name.split(' ')[0]} is on the way`
        : `${artisan.name.split(' ')[0]} · ${TRADE_LABELS[job.trade]}`

  return (
    <div className="pb-8">
      <RomanSection index={2} title="LIVE JOB" />
      <div className="mt-4 frame p-4 bg-parchment-soft">
        <JobStatusPill status={job.status} pulse={job.status === 'working'} />
        <h1 className="display-tight text-xl font-semibold text-ink mt-3">{statusLine}</h1>
        <p className="text-sm text-slate mt-1">
          Started {format(new Date(job.updatedAt), 'h:mm a')} · tracking live
        </p>
      </div>

      <ol className="mt-6 space-y-0 relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-hairline" aria-hidden />
        {job.timeline.map((ev, i) => {
          const done = i < job.timeline.length - 1 || job.status === 'completed'
          return (
            <li key={ev.id} className="relative pl-8 pb-6">
              <span
                className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? 'bg-verdigris text-bone' : 'bg-bone border-2 border-gilt text-gilt'
                }`}
              >
                {done ? '✓' : '⏵'}
              </span>
              <p className="text-xs text-slate">{format(new Date(ev.at), 'h:mm a')}</p>
              <p className="text-sm text-ink mt-0.5">{ev.label}</p>
              {ev.voiceNote && (
                <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs text-oxblood font-semibold">
                  <FaPlay aria-hidden /> Play voice note
                </button>
              )}
              {ev.photoUrl && (
                <img src={ev.photoUrl} alt="" className="mt-2 rounded-frame w-full max-h-40 object-cover" loading="lazy" />
              )}
            </li>
          )
        })}
        {job.status !== 'completed' && (
          <li className="relative pl-8 pb-2">
            <span className="absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-hairline bg-bone" />
            <p className="text-sm text-slate italic-serif">Job complete — awaiting confirmation</p>
          </li>
        )}
      </ol>

      <div className="frame p-4 mt-4">
        <p className="text-sm text-ink">
          {artisan.name.split(' ')[0]} has not marked complete yet.
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button variant="secondary" className="text-xs px-3">Message</Button>
          <Button variant="ghost" className="text-xs px-3">Call</Button>
          <Button variant="ghost" className="text-xs px-3">Open a concern</Button>
        </div>
      </div>

      <div className="mt-6">
        <EscrowBadge
          status={job.escrowStatus}
          amountKobo={job.priceKobo}
          reference={job.escrowRef}
        />
      </div>

      {job.status === 'completed' && (
        <Link to={`/member/jobs/${job.id}/pay`} className="block mt-6">
          <Button className="w-full">Review & release payment</Button>
        </Link>
      )}
    </div>
  )
}
