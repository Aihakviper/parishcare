import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { useProvincialData } from './hooks/useProvincialData'
import { Sparkline } from './components/Sparkline'
import { formatNaira } from '../../lib/formatters'
import type { ParishAggregate } from '../../lib/provincial/aggregates'
import { cn } from '../../lib/cn'

type SortKey =
  | 'name'
  | 'cases'
  | 'disbursed'
  | 'remaining'
  | 'priority'
  | 'activity'

export function ParishComparison() {
  const { data, loading } = useProvincialData()
  const [sortKey, setSortKey] = useState<SortKey>('remaining')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    if (!data) return []
    const list = [...data.allParishes]
    const strained = list.filter((p) => p.strained)
    const healthy = list.filter((p) => !p.strained)

    const sortFn = (a: ParishAggregate, b: ParishAggregate) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'cases':
          cmp = a.casesThisMonth - b.casesThisMonth
          break
        case 'disbursed':
          cmp = a.disbursedKobo - b.disbursedKobo
          break
        case 'remaining':
          cmp = a.budgetRemainingKobo - b.budgetRemainingKobo
          break
        case 'priority':
          cmp = a.avgPriorityScore - b.avgPriorityScore
          break
        case 'activity':
          cmp =
            new Date(a.lastActivityAt ?? 0).getTime() -
            new Date(b.lastActivityAt ?? 0).getTime()
          break
      }
      return sortAsc ? cmp : -cmp
    }

    strained.sort(sortFn)
    healthy.sort(sortFn)
    return [...strained, ...healthy]
  }, [data, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  if (loading || !data) {
    return <p className="text-slate text-sm py-12">Loading parish comparison…</p>
  }

  return (
    <div>
      <EyebrowLabel>II · Parish comparison</EyebrowLabel>
      <h1 className="display-tight text-xl sm:text-2xl font-semibold text-ink mt-2 mb-6">
        Every parish in {data.provinceLabel}
      </h1>

      <div className="frame table-scroll-fade">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-hairline text-left">
              {(
                [
                  ['name', 'Parish'],
                  ['cases', 'Cases this month'],
                  ['disbursed', 'Disbursed'],
                  ['remaining', 'Budget remaining'],
                  ['priority', 'Avg priority'],
                  ['activity', 'Last activity'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="py-3 px-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="mono-tag hover:text-oxblood normal-case"
                  >
                    {label}
                    {sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((parish) => {
              const expanded = expandedId === parish.id
              return (
                <tr
                  key={parish.id}
                  className={cn(
                    'border-b border-hairline/60 hover:bg-parchment-soft/50',
                    parish.strained && 'bg-oxblood/[0.03]',
                  )}
                >
                  <td colSpan={6} className="p-0">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() =>
                        setExpandedId(expanded ? null : parish.id)
                      }
                    >
                      <div className="grid grid-cols-6 gap-2 py-3 px-3 items-center">
                        <span
                          className={cn(
                            'font-medium',
                            parish.strained ? 'text-oxblood' : 'text-ink',
                          )}
                        >
                          {parish.name.replace(/^RCCG\s*/, '')}
                          {parish.strained && (
                            <span className="ml-2 text-xs font-normal italic-serif">
                              strained
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums">{parish.casesThisMonth}</span>
                        <span className="tabular-nums">
                          {formatNaira(parish.disbursedKobo)}
                        </span>
                        <span className="tabular-nums">
                          {formatNaira(parish.budgetRemainingKobo)}
                        </span>
                        <span className="tabular-nums">{parish.avgPriorityScore}</span>
                        <span className="text-slate text-xs">
                          {parish.lastActivityAt
                            ? formatDistanceToNow(new Date(parish.lastActivityAt), {
                                addSuffix: true,
                              })
                            : '—'}
                        </span>
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-4 border-t border-hairline/40 bg-parchment-soft/30">
                        <p className="mono-tag mt-3 mb-2">14-day case trend</p>
                        <Sparkline data={parish.trend14d} />
                        <p className="text-xs text-slate mt-2">
                          Pastor {parish.pastorName} · {parish.province}
                        </p>
                        <p className="text-xs text-slate mt-1 italic">
                          Aggregate view only — individual case access is not available
                          at provincial level.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
