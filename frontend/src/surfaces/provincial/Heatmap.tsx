import { useState } from 'react'
import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { useProvincialData } from './hooks/useProvincialData'
import { formatNaira } from '../../lib/formatters'
import type { ParishAggregate } from '../../lib/provincial/aggregates'
import { cn } from '../../lib/cn'

/** Stylized dot positions on a simple Lagos State silhouette (viewBox 0 0 400 320). */
const DOT_POSITIONS: Record<string, { x: number; y: number }> = {
  'parish-ikorodu-central': { x: 280, y: 120 },
  'parish-house-on-the-rock-yaba': { x: 200, y: 160 },
  'parish-salvation-arena-oshodi': { x: 220, y: 140 },
  'parish-fountain-of-life-ikeja': { x: 180, y: 120 },
  'parish-holy-ghost-festac': { x: 240, y: 200 },
  'parish-open-heavens-surulere': { x: 190, y: 180 },
  'parish-throne-of-grace-lekki': { x: 260, y: 220 },
  'parish-grace-assembly-berger': { x: 160, y: 100 },
  'parish-mercy-seat-egbeda': { x: 240, y: 90 },
  'parish-mararaba': { x: 320, y: 80 },
}

function dotRadius(cases: number): number {
  return Math.min(18, Math.max(8, 6 + cases * 1.2))
}

function dotColor(parish: ParishAggregate): string {
  if (parish.strained) return '#5B1A1A'
  if (parish.casesThisMonth >= 6) return '#B8935A'
  return '#2D5544'
}

export function Heatmap() {
  const { data, loading } = useProvincialData()
  const [hovered, setHovered] = useState<ParishAggregate | null>(null)

  if (loading || !data) {
    return <p className="text-slate text-sm py-12">Loading map…</p>
  }

  const mapped = data.graceMap.filter((p: ParishAggregate) => DOT_POSITIONS[p.id])

  return (
    <div>
      <EyebrowLabel>III · Geographic view</EyebrowLabel>
      <h1 className="display-tight text-xl font-semibold text-ink mt-2 mb-4">
        Need across the province
      </h1>

      <div className="frame p-4 sm:p-6 relative">
        <svg
          viewBox="0 0 400 320"
          className="w-full max-w-2xl mx-auto"
          role="img"
          aria-label="Stylized map of parish activity"
        >
          <path
            d="M 60 200 Q 80 80 200 60 Q 320 50 350 150 Q 360 250 220 280 Q 100 300 50 220 Z"
            fill="#EFE9DA"
            stroke="#D9D2C1"
            strokeWidth="1.5"
          />
          <text x="200" y="300" textAnchor="middle" className="fill-slate text-[10px] font-sans">
            Lagos &amp; corridor · stylized
          </text>
          {mapped.map((parish: ParishAggregate) => {
            const pos = DOT_POSITIONS[parish.id]
            const r = dotRadius(parish.casesThisMonth)
            return (
              <g
                key={parish.id}
                onMouseEnter={() => setHovered(parish)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-default"
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={dotColor(parish)}
                  fillOpacity={0.85}
                  stroke="#F5F0E5"
                  strokeWidth={2}
                />
              </g>
            )
          })}
        </svg>

        {hovered && (
          <div
            className={cn(
              'absolute top-4 right-4 max-w-xs frame p-3 text-sm shadow-frame',
              hovered.strained && 'border-oxblood/40',
            )}
          >
            <p className="font-medium text-ink">
              {hovered.name.replace(/^RCCG\s*/, '')}
            </p>
            <p className="text-slate text-xs mt-1">
              {hovered.casesThisMonth} cases · {formatNaira(hovered.disbursedKobo)} disbursed
            </p>
            <p className="text-slate text-xs">
              Budget remaining: {formatNaira(hovered.budgetRemainingKobo)}
            </p>
            {hovered.strained && (
              <p className="text-oxblood text-xs mt-1 italic-serif">Strained</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-verdigris" /> Healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gilt" /> High activity
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-oxblood" /> Strained
          </span>
        </div>
      </div>
    </div>
  )
}
