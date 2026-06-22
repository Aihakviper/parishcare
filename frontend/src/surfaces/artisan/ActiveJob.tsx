import { useParams } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { EscrowBadge } from '../../components/ui/EscrowBadge'
import { useJob, useJobMutations } from '../../hooks/useCampData'
import { useVoiceStore } from '../../store/voice'

const PHOTO =
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop'

export function ArtisanActiveJob() {
  const { id } = useParams()
  const { data: job } = useJob(id)
  const { updateStatus, acceptJob } = useJobMutations()
  const openPanel = useVoiceStore((s) => s.openPanel)

  if (!job) return <p className="italic-serif text-slate py-12">Loading job…</p>

  const handleAction = async () => {
    if (job.status === 'requested') {
      await acceptJob.mutateAsync(job.id)
      await updateStatus.mutateAsync({ id: job.id, status: 'en_route' })
    } else if (job.status === 'accepted' || job.status === 'en_route') {
      await updateStatus.mutateAsync({
        id: job.id,
        status: 'working',
        extra: { photo: 'before', photoUrl: job.photos.before ?? PHOTO },
      })
    } else if (job.status === 'working') {
      await updateStatus.mutateAsync({
        id: job.id,
        status: 'completed',
        extra: { photo: 'after', photoUrl: PHOTO },
      })
    }
  }

  const actionLabel =
    job.status === 'requested'
      ? 'Accept & start'
      : job.status === 'accepted' || job.status === 'en_route'
        ? 'Tap when you arrive / start work'
        : job.status === 'working'
          ? 'Tap when finished'
          : 'Awaiting Funmi\'s confirmation'

  return (
    <div className="pb-8">
      <RomanSection index={1} title="ACTIVE JOB" />
      <h1 className="display-tight text-xl font-semibold text-ink mt-3">Funmi Adebanjo</h1>
      <p className="text-sm text-slate mt-1">Phase 2 · Faith Avenue · House 14</p>
      <p className="text-sm text-ink mt-4">{job.description}</p>

      <div className="mt-6 frame p-4 bg-parchment-soft">
        <p className="font-semibold text-ink">{actionLabel}</p>
        {job.status !== 'completed' && job.status !== 'closed' && (
          <Button onClick={handleAction} className="w-full mt-4">
            {job.status === 'working' ? 'I don finish' : 'Continue'}
          </Button>
        )}
        {job.status === 'completed' && (
          <p className="italic-serif text-slate text-sm mt-2">
            Mrs Adebanjo is reviewing. Payment will release when she confirms.
          </p>
        )}
      </div>

      <div className="mt-6">
        <p className="eyebrow">Photos</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(['before', 'during', 'after'] as const).map((key) => (
            <div key={key} className="aspect-square rounded-frame bg-parchment-soft overflow-hidden">
              {job.photos[key] ? (
                <img src={job.photos[key]} alt={key} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center mono-tag text-[0.5rem] p-1 text-center">
                  {key}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button variant="secondary" onClick={openPanel} className="w-full mt-6">
        Send voice note · or tell Bayo
      </Button>

      <div className="mt-6">
        <EscrowBadge status={job.escrowStatus} amountKobo={job.priceKobo} reference={job.escrowRef} />
      </div>
    </div>
  )
}
