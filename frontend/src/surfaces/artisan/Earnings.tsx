import { RomanSection } from '../../components/ui/RomanSection'
import { Button } from '../../components/ui/Button'
import { Money } from '../../components/ui/Money'
import { useJobs, HERO_IDS } from '../../hooks/useCampData'
import { formatNaira } from '../../lib/formatters'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

const CHART = [
  { day: 'Mon', amount: 8500 },
  { day: 'Tue', amount: 12000 },
  { day: 'Wed', amount: 0 },
  { day: 'Thu', amount: 15000 },
  { day: 'Fri', amount: 8500 },
  { day: 'Sat', amount: 17575 },
  { day: 'Sun', amount: 0 },
]

export function ArtisanEarnings() {
  const { data: jobs = [] } = useJobs({ artisanId: HERO_IDS.artisanId })
  const held = jobs.filter((j) => j.escrowStatus === 'held').reduce((s, j) => s + j.priceKobo, 0)
  const released = jobs
    .filter((j) => j.escrowStatus === 'released')
    .reduce((s, j) => s + Math.round(j.priceKobo * 0.95), 0)

  return (
    <div>
      <RomanSection index={2} title="EARNINGS" />
      <Money kobo={released || 1_757_500} label="Available to withdraw" size="lg" className="mt-4" />
      <p className="text-sm text-slate mt-2">
        In escrow: <strong className="text-ink">{formatNaira(held || 1_850_000)}</strong>
      </p>
      <Button className="w-full mt-4">Withdraw to bank</Button>

      <div className="mt-8 frame p-4 h-48">
        <p className="mono-tag mb-2">This week</p>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={CHART}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6B6B6B" />
            <YAxis hide />
            <Area type="monotone" dataKey="amount" stroke="#5B1A1A" fill="#5B1A1A" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h2 className="eyebrow mt-8">Recent transactions</h2>
      <ul className="mt-3 space-y-2 font-mono text-[0.65rem] text-slate">
        <li className="frame p-3 text-ink">
          ✓ Sat · Released {formatNaira(1_757_500)} · Funmi A · generator · STW-RLS-001847
        </li>
        <li className="frame p-3">
          ✓ Fri · Released {formatNaira(850_000)} · Ngozi E · pipe · STW-RLS-001841
        </li>
        <li className="frame p-3 border-gilt/40">
          ⊙ Today · Held {formatNaira(1_850_000)} · Funmi A · generator · STW-ESC-001847
        </li>
      </ul>
    </div>
  )
}
