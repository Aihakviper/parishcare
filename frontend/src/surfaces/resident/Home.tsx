import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RomanSection } from '../../components/ui/RomanSection'
import { SearchBar } from '../../components/ui/SearchBar'
import { ArtisanCard } from '../../components/ui/ArtisanCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { useArtisans, useApprenticeships, HERO_IDS } from '../../hooks/useCampData'
import { HERO_ARTISAN_ID, TRADE_LABELS, type Trade } from '../../lib/types/camp'
import { LIST_ITEM, LIST_STAGGER } from '../../lib/motion'

const CATEGORIES: Trade[] = [
  'generator_tech',
  'plumber',
  'electrician',
  'tailor',
  'mechanic',
  'carpenter',
  'painter',
  'cleaner',
  'AC_tech',
  'welder',
  'hair_braider',
]

export function ResidentHome() {
  const [query, setQuery] = useState('')
  const [trade, setTrade] = useState<Trade | undefined>()
  const { data: artisans = [], isLoading } = useArtisans({ query, trade })
  const { data: supportedApprentices = [] } = useApprenticeships({ memberId: HERO_IDS.memberId })

  const trusted = artisans.filter((a) =>
    [HERO_ARTISAN_ID, 'artisan-emeka-okonkwo'].includes(a.id),
  )
  const nearby = artisans.slice(0, 6)

  return (
    <div>
      <RomanSection index={0} title="GOOD MORNING, BISI" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">
        Find a Trusted Steward
      </h1>
      <p className="text-slate text-sm mt-2">
        Phase 2 · Service Sunday in 6 hours. Your generator can wait no longer.
      </p>

      <SearchBar
        value={query}
        onChange={setQuery}
        className="mt-5"
        onVoice={() => setQuery('generator')}
      />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {CATEGORIES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrade(trade === t ? undefined : t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors min-h-[36px] ${
              trade === t
                ? 'bg-oxblood text-bone border-oxblood'
                : 'bg-bone text-slate border-hairline hover:border-oxblood/30'
            }`}
          >
            {TRADE_LABELS[t]}
          </button>
        ))}
      </div>

      {supportedApprentices.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow">Apprentices you support</h2>
          <p className="text-xs text-slate mt-1">Your bookings help train the next pair of hands.</p>
          <ul className="mt-3 space-y-2">
            {supportedApprentices.map((a) => (
              <li key={a.id} className="frame p-3 text-sm">
                <span className="font-semibold text-ink">{a.apprenticeName}</span>
                <span className="text-slate"> · training under Tunde · {a.monthsIn} months</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="eyebrow">Your trusted Stewards</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {trusted.map((a) => (
            <Link
              key={a.id}
              to={`/member/artisan/${a.id}`}
              className="shrink-0 w-36 frame p-3 hover:shadow-lift transition-shadow"
            >
              <img
                src={a.photoUrl}
                alt=""
                className="w-12 h-12 rounded-frame object-cover"
              />
              <p className="font-semibold text-sm text-ink mt-2 truncate">{a.name.split(' ')[0]}</p>
              <p className="text-xs text-slate">{TRADE_LABELS[a.trade]}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">Nearby and ready</h2>
          <Link to="/member/discover" className="text-xs font-semibold text-oxblood">
            See all
          </Link>
        </div>

        {isLoading ? (
          <p className="text-slate text-sm mt-4">Loading artisans…</p>
        ) : nearby.length === 0 ? (
          <EmptyState message="No Steward matches today. Try widening your search." />
        ) : (
          <motion.ul
            className="mt-3 space-y-3"
            variants={LIST_STAGGER}
            initial="hidden"
            animate="show"
          >
            {nearby.map((a) => (
              <motion.li key={a.id} variants={LIST_ITEM}>
                <ArtisanCard artisan={a} to={`/member/artisan/${a.id}`} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>
    </div>
  )
}
