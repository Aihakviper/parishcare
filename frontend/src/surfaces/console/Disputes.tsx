import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { RomanSection } from '../../components/ui/RomanSection'
import { EmptyState } from '../../components/ui/EmptyState'
import { useDisputes } from '../../hooks/useCampData'
import { formatNaira } from '../../lib/formatters'

export function ConsoleDisputes() {
  const { data: disputes = [] } = useDisputes()
  const open = disputes.filter((d) => d.status !== 'resolved')

  return (
    <div>
      <RomanSection index={3} title="DISPUTE QUEUE" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Mediation</h1>

      {open.length > 0 && (
        <div className="mt-4 frame p-4 border-oxblood/20 bg-oxblood/5">
          <p className="mono-tag text-oxblood">Triage</p>
          <p className="text-sm text-ink mt-1">
            {open.length} open · oldest {formatDistanceToNow(new Date(open[0].openedAt), { addSuffix: true })}
          </p>
        </div>
      )}

      {disputes.length === 0 ? (
        <EmptyState message="No disputes pending. May it stay so." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-frame border border-hairline bg-bone">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-parchment-soft mono-tag">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Escrow</th>
                <th className="p-3 text-left">Age</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-b border-hairline/50 hover:bg-parchment-soft/40">
                  <td className="p-3">
                    <Link to={`/console/disputes/${d.id}`} className="font-mono text-xs text-oxblood font-semibold">
                      {d.id}
                    </Link>
                  </td>
                  <td className="p-3 text-slate max-w-xs truncate">{d.reason}</td>
                  <td className="p-3">{formatNaira(d.escrowKobo)}</td>
                  <td className="p-3 text-xs">{formatDistanceToNow(new Date(d.openedAt), { addSuffix: true })}</td>
                  <td className="p-3 capitalize">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
