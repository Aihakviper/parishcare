import { Link } from 'react-router-dom'
import { RomanSection } from '../../components/ui/RomanSection'
import { Card } from '../../components/ui/Card'
import { useCampStats, usePatterns, useArtisans } from '../../hooks/useCampData'
import { TRADE_LABELS } from '../../lib/types/camp'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

const TRADE_CHART = [
  { trade: 'Gen', count: 18 },
  { trade: 'Plumb', count: 14 },
  { trade: 'Elec', count: 12 },
  { trade: 'Paint', count: 8 },
  { trade: 'Clean', count: 6 },
]

export function ConsoleOverview() {
  const { data: stats } = useCampStats()
  const { data: patterns = [] } = usePatterns()
  const { data: artisans = [] } = useArtisans({ tier: 'verified' })
  const newJoiners = artisans.slice(0, 6)

  const cards = [
    { label: 'Jobs completed', value: stats?.jobsCompletedWeek ?? 47 },
    { label: 'Active artisans', value: stats?.activeArtisans ?? 38 },
    { label: 'Avg response', value: `${stats?.avgResponseMinutes ?? 18}m` },
    {
      label: 'Disputes pending',
      value: stats?.disputesPending ?? 2,
      alert: (stats?.disputesPending ?? 0) > 0,
    },
    {
      label: 'Disbursed this month',
      value: stats ? Math.round(stats.totalDisbursedKobo / 100).toLocaleString('en-NG') : '—',
      money: true,
    },
  ]

  return (
    <div>
      <RomanSection index={0} title="THIS WEEK AT THE CAMP" />
      <h1 className="display-tight text-3xl font-semibold text-ink mt-3">
        The body is at work.
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-8">
        {cards.map(({ label, value, alert, money }) => (
          <Card key={label} hover={false}>
            <p className="mono-tag">{label}</p>
            {money ? (
              <p className="display-tight text-2xl font-semibold text-ink mt-2">₦{value}</p>
            ) : (
              <p
                className={`display-tight text-3xl font-semibold mt-2 ${
                  alert ? 'text-oxblood' : 'text-ink'
                }`}
              >
                {value}
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <Card hover={false} className="p-6">
          <h2 className="eyebrow">Where work is happening</h2>
          <svg viewBox="0 0 400 220" className="w-full mt-4" aria-label="Camp heat map">
            {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].map((phase, i) => (
              <g key={phase}>
                <rect
                  x={20 + (i % 2) * 190}
                  y={20 + Math.floor(i / 2) * 100}
                  width={170}
                  height={85}
                  rx={6}
                  fill={phase === 'Phase 2' ? '#EFE9DA' : '#FFFFFF'}
                  stroke="#D9D2C1"
                />
                <text x={35 + (i % 2) * 190} y={45 + Math.floor(i / 2) * 100} className="text-[11px] fill-ink font-semibold">
                  {phase}
                </text>
                {[...Array(phase === 'Phase 2' ? 8 : 3 + i)].map((_, j) => (
                  <circle
                    key={j}
                    cx={45 + j * 18 + (i % 2) * 190}
                    cy={70 + Math.floor(i / 2) * 100}
                    r={4}
                    fill="#5B1A1A"
                    opacity={0.4 + j * 0.08}
                  />
                ))}
              </g>
            ))}
          </svg>
        </Card>

        <Card hover={false} className="p-6">
          <h2 className="eyebrow">What Steward is noticing</h2>
          <ul className="mt-4 space-y-4">
            {patterns.map((p) => (
              <li key={p.id} className="border-l-2 border-gilt pl-3">
                <p className="font-semibold text-ink text-sm">{p.title}</p>
                <p className="text-sm text-slate mt-1">{p.explanation}</p>
              </li>
            ))}
          </ul>
          <Link to="/console/patterns" className="text-sm font-semibold text-oxblood mt-4 inline-block">
            View all patterns →
          </Link>
        </Card>
      </div>

      <Card hover={false} className="mt-6 p-6 h-56">
        <p className="mono-tag">Trade activity · 14 days</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={TRADE_CHART}>
            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
            <YAxis hide />
            <Bar dataKey="count" fill="#2D5544" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <section className="mt-8">
        <h2 className="eyebrow">Latest verified artisans</h2>
        <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
          {newJoiners.map((a) => (
            <Link
              key={a.id}
              to={`/console/artisans/${a.id}`}
              className="shrink-0 frame p-3 w-32 hover:shadow-lift transition-shadow"
            >
              <img src={a.photoUrl} alt="" className="w-10 h-10 rounded-frame object-cover" />
              <p className="text-sm font-semibold text-ink mt-2 truncate">{a.name.split(' ')[0]}</p>
              <p className="text-xs text-slate">{TRADE_LABELS[a.trade]}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
