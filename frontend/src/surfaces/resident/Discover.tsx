import { useState } from 'react'
import { motion } from 'framer-motion'
import { RomanSection } from '../../components/ui/RomanSection'
import { SearchBar } from '../../components/ui/SearchBar'
import { ArtisanCard } from '../../components/ui/ArtisanCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { useArtisans } from '../../hooks/useCampData'
import { TRADE_LABELS, type Trade } from '../../lib/types/camp'
import { LIST_ITEM, LIST_STAGGER } from '../../lib/motion'

export function ResidentDiscover() {
  const [query, setQuery] = useState('')
  const [trade, setTrade] = useState<Trade | undefined>()
  const [view, setView] = useState<'list' | 'map'>('list')
  const { data: artisans = [] } = useArtisans({ query, trade })

  return (
    <div>
      <RomanSection index={1} title="DISCOVER" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">Browse Stewards</h1>

      <SearchBar value={query} onChange={setQuery} className="mt-5" />

      <div className="mt-4 flex gap-2 flex-wrap">
        {(Object.keys(TRADE_LABELS) as Trade[]).slice(0, 8).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrade(trade === t ? undefined : t)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              trade === t ? 'bg-oxblood text-bone border-oxblood' : 'border-hairline text-slate'
            }`}
          >
            {TRADE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-semibold rounded-frame border ${
              view === v ? 'bg-oxblood text-bone border-oxblood' : 'border-hairline text-slate'
            }`}
          >
            {v === 'list' ? 'List' : 'Camp map'}
          </button>
        ))}
      </div>

      {view === 'map' ? (
        <div className="mt-6 frame p-6 bg-parchment-soft">
          <svg viewBox="0 0 320 200" className="w-full h-auto" aria-label="Camp phase map">
            {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].map((phase, i) => (
              <g key={phase}>
                <rect
                  x={20 + (i % 2) * 150}
                  y={20 + Math.floor(i / 2) * 90}
                  width={130}
                  height={75}
                  rx={6}
                  fill="#FFFFFF"
                  stroke="#D9D2C1"
                />
                <text x={35 + (i % 2) * 150} y={45 + Math.floor(i / 2) * 90} className="text-[10px] fill-slate font-sans">
                  {phase}
                </text>
                {artisans.slice(i * 3, i * 3 + 3).map((a, j) => (
                  <circle
                    key={a.id}
                    cx={50 + j * 25 + (i % 2) * 150}
                    cy={70 + Math.floor(i / 2) * 90}
                    r={5}
                    fill="#5B1A1A"
                  />
                ))}
              </g>
            ))}
          </svg>
          <p className="mono-tag mt-3 text-center">{artisans.length} artisans on map</p>
        </div>
      ) : artisans.length === 0 ? (
        <EmptyState message="No Steward matches today. Try widening your search." />
      ) : (
        <motion.ul className="mt-6 space-y-3" variants={LIST_STAGGER} initial="hidden" animate="show">
          {artisans.map((a) => (
            <motion.li key={a.id} variants={LIST_ITEM}>
              <ArtisanCard artisan={a} to={`/member/artisan/${a.id}`} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
