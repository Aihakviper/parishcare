import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { useProvincialData } from './hooks/useProvincialData'
import { HeroStats } from './components/HeroStats'
import { GraceMap } from './components/GraceMap'
import { PatternsPanel } from './components/PatternsPanel'

export function ProvincialDashboard() {
  const { data, loading } = useProvincialData()

  if (loading || !data) {
    return <p className="text-slate text-sm py-12">Loading provincial view…</p>
  }

  const maxDisbursed = Math.max(...data.graceMap.map((p: { disbursedKobo: number }) => p.disbursedKobo), 1)

  return (
    <div>
      <header className="mb-8">
        <EyebrowLabel>
          I · {data.provinceLabel} · {data.periodLabel}
        </EyebrowLabel>
        <h1 className="display-tight text-2xl sm:text-3xl font-semibold text-ink mt-2">
          Where the body is moving.
        </h1>
        <div className="mt-5">
          <HeroStats data={data} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <GraceMap parishes={data.graceMap} maxDisbursed={maxDisbursed} />
        </div>
        <div className="lg:col-span-5" data-tour="provincial-patterns">
          <PatternsPanel patterns={data.patterns} />
        </div>
      </div>

      <p className="mono-tag mt-8 text-center">
        Aggregates only · no individual records at provincial level
      </p>
    </div>
  )
}
