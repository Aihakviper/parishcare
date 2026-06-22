import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { Money } from '../../components/ui/Money'
import { useDispute, useJobMutations } from '../../hooks/useCampData'
import { formatDistanceToNow } from 'date-fns'

export function ConsoleDisputeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: dispute } = useDispute(id)
  const { resolveDispute } = useJobMutations()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  if (!dispute) return <p className="italic-serif text-slate py-12">Loading dispute…</p>

  const handleResolve = async (outcome: 'release' | 'refund') => {
    setLoading(true)
    await resolveDispute.mutateAsync({ id: dispute.id, outcome, note: note || 'Resolved by Camp admin.' })
    setLoading(false)
    navigate('/console/disputes')
  }

  return (
    <div className="pb-24">
      <RomanSection index={4} title="DISPUTE RESOLUTION" />
      <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
        <div>
          <h1 className="display-tight text-2xl font-semibold text-ink">{dispute.id}</h1>
          <p className="text-sm text-slate mt-1">
            Opened {formatDistanceToNow(new Date(dispute.openedAt), { addSuffix: true })} · Job {dispute.jobId}
          </p>
        </div>
        <Money kobo={dispute.escrowKobo} label="Escrow held" size="sm" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="frame p-5">
          <p className="mono-tag">Resident account</p>
          <p className="font-semibold text-ink mt-2">{dispute.reason}</p>
          <p className="text-sm text-slate mt-3 leading-relaxed">{dispute.residentStatement}</p>
        </div>
        <div className="frame p-5">
          <p className="mono-tag">Artisan account</p>
          <p className="text-sm text-slate mt-3 leading-relaxed">{dispute.artisanStatement}</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] bg-bone border-t border-hairline p-4 sm:p-6">
        <label className="block text-sm text-slate mb-2">Mediator note (visible to both parties)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-frame border border-hairline p-3 text-sm mb-4"
          placeholder="Explain your decision…"
        />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleResolve('release')} disabled={loading}>
            Release to artisan
          </Button>
          <Button variant="secondary" onClick={() => handleResolve('refund')} disabled={loading}>
            Refund to resident
          </Button>
        </div>
      </div>
    </div>
  )
}
