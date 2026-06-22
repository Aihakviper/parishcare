import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { StewardMark } from '../../components/ui/StewardMark'

export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <StewardMark />
          <span className="display-tight text-xl font-semibold text-ink">Steward</span>
        </div>
        <Link to="/resident">
          <Button variant="primary">Enter demo</Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-2xl mx-auto">
        <p className="mono-tag">Kingdom Hackathon 2026</p>
        <h1 className="display-tight text-4xl sm:text-5xl font-semibold text-ink mt-4 leading-tight">
          Diligent hands. Honest work. Trust you can build with.
        </h1>
        <p className="text-slate mt-6 leading-relaxed">
          Verified artisans for RCCG Camp Smart City. Residents hire with escrow. Artisans
          work through Bayo. Camp leadership sees the whole economy.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-10">
          <Link to="/resident">
            <Button>Resident app</Button>
          </Link>
          <Link to="/artisan">
            <Button variant="secondary">Artisan app</Button>
          </Link>
          <Link to="/console">
            <Button variant="ghost">Camp console</Button>
          </Link>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate border-t border-hairline">
        <p className="italic-serif text-sm text-slate max-w-md mx-auto px-4">
          Seest thou a man diligent in his business? He shall stand before kings. — Proverbs
          22:29
        </p>
      </footer>
    </div>
  )
}
