import { useEffect } from 'react'
import { IntegrityHero } from './components/IntegrityHero'
import { ChainHealthPanel } from './components/ChainHealthPanel'
import { RecentActivityLog } from './components/RecentActivityLog'
import { useAuditData } from './hooks/useAuditData'
import { useTourStore } from '../../store/tour'

export function AuditorDashboard() {
  const {
    displayed,
    integrity,
    loading,
    checking,
    lastCheckedAt,
    refresh,
    runIntegrityCheck,
  } = useAuditData()

  const tourActive = useTourStore((s) => s.active)
  const tourStep = useTourStore((s) => s.step)

  useEffect(() => {
    if (tourActive && tourStep === 6) {
      void refresh()
    }
  }, [tourActive, tourStep, refresh])

  if (loading || !integrity) {
    return <p className="text-slate text-sm py-12">Loading audit ledger…</p>
  }

  return (
    <div>
      <IntegrityHero
        entryCount={integrity.entryCount}
        valid={integrity.valid}
        lastCheckedAt={lastCheckedAt}
        checking={checking}
        onRunCheck={() => void runIntegrityCheck()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ChainHealthPanel entries={displayed} />
        </div>
        <div className="lg:col-span-5">
          <RecentActivityLog entries={displayed} />
        </div>
      </div>

      <p className="mono-tag mt-8 text-center">
        Tamper-evident ledger · beneficiary identities redacted at audit tier
      </p>
    </div>
  )
}
