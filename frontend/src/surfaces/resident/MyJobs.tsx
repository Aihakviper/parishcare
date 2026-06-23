import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { RomanSection } from '../../components/ui/RomanSection'
import { Card } from '../../components/ui/Card'
import { JobStatusPill } from '../../components/ui/JobStatusPill'
import { EmptyState } from '../../components/ui/EmptyState'
import { useJobs, useArtisan, HERO_IDS } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'
import { formatNaira } from '../../lib/formatters'

export function ResidentMyJobs() {
  const { data: jobs = [] } = useJobs({ residentId: HERO_IDS.residentId })
  const active = jobs.filter((j) => !['completed', 'closed'].includes(j.status))
  const past = jobs.filter((j) => ['completed', 'closed'].includes(j.status))

  return (
    <div>
      <RomanSection index={1} title="MY JOBS" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Your work at the Camp</h1>

      <section className="mt-6">
        <h2 className="eyebrow">Active</h2>
        {active.length === 0 ? (
          <EmptyState message="No jobs yet today. Take fifteen minutes." />
        ) : (
          <div className="mt-3 space-y-3">
            {active.map((job) => (
              <ActiveJobCard key={job.id} jobId={job.id} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="eyebrow">Past</h2>
        {past.length === 0 ? (
          <EmptyState message="Your history will gather here." />
        ) : (
          <div className="mt-3 space-y-3">
            {past.map((job) => (
              <Card key={job.id} hover={false}>
                <p className="font-semibold text-ink">{TRADE_LABELS[job.trade]}</p>
                <p className="text-xs text-slate mt-1">
                  {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                </p>
                <Link to={`/member/jobs/${job.id}`} className="text-sm text-oxblood font-semibold mt-2 inline-block">
                  View
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ActiveJobCard({ jobId }: { jobId: string }) {
  const { data: jobs } = useJobs({ residentId: HERO_IDS.residentId })
  const job = jobs?.find((j) => j.id === jobId)
  const { data: artisan } = useArtisan(job?.artisanId)

  if (!job || !artisan) return null

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{artisan.name}</p>
          <p className="text-sm text-slate">{TRADE_LABELS[job.trade]}</p>
        </div>
        <JobStatusPill status={job.status} pulse={job.status === 'working'} />
      </div>
      <p className="text-sm text-slate mt-2 line-clamp-2">{job.description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="font-semibold text-ink">{formatNaira(job.priceKobo)}</span>
        <Link to={`/member/jobs/${job.id}`} className="text-sm font-semibold text-oxblood">
          View
        </Link>
      </div>
    </Card>
  )
}
