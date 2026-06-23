import { useState } from 'react'
import { RomanSection } from '../../components/ui/RomanSection'
import { TierPill } from '../../components/ui/TierPill'
import { useLineage, useCampSession } from '../../hooks/useCampData'

export function ConsoleLineage() {
  const { artisanId: sessionArtisanId } = useCampSession()
  const [artisanId, setArtisanId] = useState(sessionArtisanId ?? '')
  const { data: nodes = [] } = useLineage(artisanId)

  return (
    <div>
      <RomanSection index={3} title="LINEAGE" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Concentric network</h1>
      <p className="text-slate text-sm mt-2">Master → artisan → apprentice. Trust flows outward.</p>

      <label className="block mt-6">
        <span className="mono-tag">Artisan ID (demo)</span>
        <input
          value={artisanId}
          onChange={(e) => setArtisanId(e.target.value)}
          className="mt-2 w-full max-w-md rounded-frame border border-hairline p-3 bg-bone text-sm font-mono"
        />
      </label>

      <ol className="mt-8 space-y-4 max-w-md">
        {nodes.map((node, i) => (
          <li key={node.id} className="frame p-4 relative">
            {i < nodes.length - 1 && (
              <span className="absolute left-6 top-full h-4 w-px bg-hairline" aria-hidden />
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{node.name}</p>
                <p className="text-xs text-slate capitalize">{node.role}</p>
              </div>
              <TierPill
                tier={node.tier === 'unverified' ? 'verified' : node.tier}
                className={node.tier === 'unverified' ? 'opacity-60' : undefined}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
