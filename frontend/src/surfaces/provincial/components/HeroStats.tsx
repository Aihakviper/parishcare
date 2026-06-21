import { formatNaira } from '../../../lib/formatters'
import type { ProvincialDashboardData } from '../../../lib/provincial/aggregates'

interface HeroStatsProps {
  data: ProvincialDashboardData
}

function formatMillions(kobo: number): string {
  const naira = kobo / 100
  if (naira >= 1_000_000) {
    return `₦${(naira / 1_000_000).toFixed(1)}M`
  }
  return formatNaira(kobo)
}

export function HeroStats({ data }: HeroStatsProps) {
  const items = [
    { value: formatMillions(data.totalDisbursedKobo), label: 'disbursed' },
    { value: data.familiesServed.toLocaleString('en-NG'), label: 'families' },
    { value: String(data.parishesActive), label: 'parishes active' },
    {
      value: String(data.parishesStrained),
      label: `parish${data.parishesStrained === 1 ? '' : 'es'} strained`,
    },
  ]

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-2 text-base sm:text-lg text-ink">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-hairline select-none">·</span>}
          <span>
            <strong className="display-tight font-semibold">{item.value}</strong>{' '}
            <span className="text-slate text-sm sm:text-base">{item.label}</span>
          </span>
        </span>
      ))}
    </div>
  )
}
