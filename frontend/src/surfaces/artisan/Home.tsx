import { RomanSection } from '../../components/ui/RomanSection'
import { BayoOrb } from '../../components/voice/BayoOrb'
import { TierPill } from '../../components/ui/TierPill'

export function ArtisanHome() {
  return (
    <div>
      <RomanSection index={0} title="BAYO READY · TRUSTED TUNDE" />
      <h1 className="display-tight text-2xl font-semibold text-ink mt-3">
        Job feed
      </h1>
      <div className="mt-6 flex flex-col items-center gap-3 frame p-6">
        <BayoOrb />
        <p className="italic-serif text-slate text-sm text-center">Tap to talk to Bayo</p>
        <TierPill tier="trusted" jobsCompleted={31} />
      </div>
      <p className="text-slate text-sm mt-6">
        Inbound requests and the hero generator job arrive in PROMPT 4.
      </p>
    </div>
  )
}
