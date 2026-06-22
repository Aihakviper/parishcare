import { Link } from 'react-router-dom'
import { EyebrowLabel } from '../../components/ui/EyebrowLabel'
import { BudgetDonut } from '../../components/charts/BudgetDonut'
import { formatNaira } from '../../lib/formatters'
import { useSessionStore } from '../../store/session'
import { HERO_CASE_ID } from '../../lib/mock-api'
import { operationalApi } from '../../lib/api/operational'
import { usesBackendApi } from '../../lib/api/config'
import { useEffect, useState } from 'react'
import type { Parish, WelfareCase } from '../../lib/types/domain'

export function PastorPulse() {
  const parishId = useSessionStore((s) => s.parishId)
  const [parish, setParish] = useState<Parish | null>(null)
  const [heroCase, setHeroCase] = useState<WelfareCase | null>(null)

  useEffect(() => {
    void (async () => {
      const parishes = await operationalApi.listParishes()
      setParish(parishes.find((p) => p.id === parishId) ?? parishes[0] ?? null)
      if (usesBackendApi) {
        const cases = await operationalApi.listCases({ parishId })
        setHeroCase(
          cases.sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? null,
        )
      } else {
        setHeroCase(await operationalApi.getCase(HERO_CASE_ID))
      }
    })()
  }, [parishId])

  if (!parish) {
    return <p className="text-slate text-sm py-12">Opening parish pulse…</p>
  }

  const pctUsed = Math.min(
    100,
    parish.monthlyBudgetKobo > 0
      ? Math.round(
          (parish.currentMonthDisbursedKobo / parish.monthlyBudgetKobo) * 100,
        )
      : 0,
  )
  const remaining = parish.monthlyBudgetKobo - parish.currentMonthDisbursedKobo
  const awaitingPastor = heroCase?.status === 'escalated'

  return (
    <div>
      <header className="hero-spotlight mb-10 sm:mb-12">
        <EyebrowLabel className="text-seafoam">III · Parish pulse</EyebrowLabel>
        <h1 className="mt-3">
          {parish.name.replace(/^RCCG\s*/, 'RCCG ')}
        </h1>
        <p className="mono-tag mt-3">
          {parish.pastorName} · {parish.province}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="frame p-6 flex flex-col items-center justify-center">
          <BudgetDonut percentUsed={pctUsed} />
          <p className="text-sm text-slate mt-4 text-center">
            <strong className="text-ink">{formatNaira(parish.currentMonthDisbursedKobo)}</strong>{' '}
            disbursed ·{' '}
            <strong className="text-ink">{formatNaira(remaining)}</strong> remaining
          </p>
        </div>

        <div className="frame p-6">
          <p className="mono-tag">This month</p>
          <ul className="mt-4 space-y-3 text-sm text-ink">
            <li>
              Monthly budget: <strong>{formatNaira(parish.monthlyBudgetKobo)}</strong>
            </li>
            <li>
              Active cases: <strong>{parish.activeCaseCount}</strong>
            </li>
            <li>
              Welfare officer: <strong>{parish.welfareOfficerName}</strong>
            </li>
          </ul>
          {awaitingPastor && (
            <Link
              to="/pastor/approvals"
              className="mt-6 inline-flex w-full items-center justify-center px-6 py-3 bg-verdigris text-bone text-sm font-semibold rounded-pill hover:bg-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam"
            >
              Review escalated case
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
