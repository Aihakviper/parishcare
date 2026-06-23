import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonaCard } from '../../components/marketing/PersonaCard'
import { StewardLogo } from '../../components/ui/StewardLogo'
import {
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconHammer,
  IconPlay,
  IconUsers,
} from '../../lib/icons'
import { cn } from '../../lib/cn'

type Audience = 'resident' | 'artisan' | 'console'

const AUDIENCES: { id: Audience; label: string; path: string }[] = [
  { id: 'resident', label: 'Members', path: '/member' },
  { id: 'artisan', label: 'Artisans', path: '/artisan' },
  { id: 'console', label: 'Parish', path: '/console' },
]

const PERSONAS = [
  {
    role: 'Member',
    icon: IconUsers,
    iconTone: 'bg-verdigris',
    name: 'Bisi, 34',
    subtitle: 'Homeowner · Phase 2',
    story:
      'Generator failed on Service Sunday. She used to call three numbers and hope someone honest would show. Cash payments left no proof when work went wrong.',
    benefits: [
      'A steward directory sorted by trust tier and vouchers from people she knows.',
      'Escrow holds payment until she confirms the job is done well.',
      'Every receipt trains apprentices through the Stewards Fund.',
    ],
  },
  {
    role: 'Artisan',
    icon: IconHammer,
    iconTone: 'bg-gilt text-ink',
    name: 'Tunde, 32',
    subtitle: 'Generator tech · Mowe',
    story:
      'Works four to six days a week. Has no formal CV — his reputation is what Mama Iyabo and Phase 2 neighbours say about him. Gets paid in cash when clients trust him.',
    benefits: [
      'Bayo reads new jobs aloud in Pidgin so he never misses a lead.',
      'Proof photos and standing score replace word-of-mouth alone.',
      'Same-day escrow release when the member confirms completion.',
    ],
  },
  {
    role: 'Parish',
    icon: IconBriefcase,
    iconTone: 'bg-ink',
    name: 'Pastor Adekunle, 48',
    subtitle: 'Camp administrator · RCCG Mowe',
    story:
      'Contractors and middlemen made it hard to know who was actually on site. Disputes landed on his desk with no timeline, no photos, and two different stories.',
    benefits: [
      'Parish Console shows jobs, disputes, and lineage in one place.',
      'Standing queue for pastoral confirmations and mentor enrollments.',
      'Pattern alerts before the same trade keeps failing across phases.',
    ],
  },
] as const

const FEATURES: Record<
  Audience,
  { eyebrow: string; title: string; subtitle: string; bullets: string[]; path: string; cta: string }
> = {
  resident: {
    eyebrow: 'For members',
    title: 'Find a Trusted Steward near you',
    subtitle:
      'Search by trade, book with escrow, and track every step until the work is done well.',
    bullets: [
      'Verified artisans sorted by trust tier and distance',
      'Escrow holds payment until you confirm completion',
      'Live timeline with photos and voice notes from your artisan',
    ],
    path: '/member',
    cta: 'Open member app',
  },
  artisan: {
    eyebrow: 'For artisans',
    title: 'Work through Bayo — your voice on the Camp',
    subtitle:
      'Accept jobs in Pidgin, upload proof, and watch your standing grow with every clean job.',
    bullets: [
      'Bayo reads new jobs aloud in your language',
      'Same-day escrow release when work is confirmed',
      'Trust ladder from Verified to Steward',
    ],
    path: '/artisan',
    cta: 'Open artisan app',
  },
  console: {
    eyebrow: 'For parish leadership',
    title: 'See the whole service economy at a glance',
    subtitle:
      'Pastor Adekunle and the facilities team resolve disputes and spot patterns before they spread.',
    bullets: [
      'Weekly pulse: jobs, artisans, disputes, disbursements',
      'Hands in training and standing confirmation queues',
      'Dispute queue with both sides visible',
    ],
    path: '/console',
    cta: 'Open parish console',
  },
}

function PhoneSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[280px] rounded-[28px] border border-hairline bg-bone p-4 shadow-lift">
      <div className="flex gap-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-parchment-soft" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-2.5 w-24 rounded-full bg-parchment-soft" />
          <div className="h-2 w-16 rounded-full bg-parchment-soft/80" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 mb-3 p-3 rounded-2xl bg-parchment-soft/60">
          <div className="w-12 h-12 rounded-xl bg-hairline/60 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-2 w-full max-w-[120px] rounded-full bg-hairline/70" />
            <div className="h-2 w-3/4 rounded-full bg-hairline/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MarketingLanding() {
  const [audience, setAudience] = useState<Audience>('resident')
  const feature = FEATURES[audience]

  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <header className="nav-pill mx-auto max-w-3xl flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <StewardLogo markSize={28} to="/marketing" />
          <nav className="hidden sm:flex items-center gap-5 text-sm font-medium text-slate">
            <a href="#people" className="hover:text-ink transition-colors">
              Who it&apos;s for
            </a>
            <a href="#views" className="hover:text-ink transition-colors">
              Three views
            </a>
          </nav>
          <Link to="/member" className="btn-pill btn-pill-primary text-xs sm:text-sm px-4 py-2 min-h-[40px]">
            Enter demo
          </Link>
        </header>
      </div>

      <section className="flex-1 px-4 pt-8 pb-16 sm:pt-16 text-center max-w-3xl mx-auto w-full">
        <div className="trust-badge mx-auto">
          <IconCheck className="w-3.5 h-3.5 text-verdigris shrink-0" aria-hidden />
          <span>Built for RCCG Camp Smart City · Kingdom Hackathon 2026</span>
        </div>

        <h1 className="display-tight text-[2.5rem] sm:text-6xl font-semibold text-ink mt-8 leading-[1.08] tracking-tight">
          Find work.
          <br />
          <span className="text-verdigris">Get paid with proof.</span>
        </h1>

        <p className="text-slate text-base sm:text-lg mt-6 max-w-xl mx-auto leading-relaxed">
          Steward gives members, artisans, and parish leadership a simple way to hire with escrow,
          prove honest work, and see the Camp&apos;s service economy — on phone, through Bayo, and
          on the web.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mt-10">
          <Link to="/member" className="btn-pill btn-pill-primary px-7 py-3.5 text-base">
            Get started
            <IconArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <Link to="/artisan" className="btn-pill btn-pill-secondary px-7 py-3.5 text-base">
            <IconPlay className="w-4 h-4" aria-hidden />
            See Bayo in action
          </Link>
        </div>
      </section>

      <section id="people" className="px-4 py-16 sm:py-20 border-t border-hairline/80 bg-bone/40">
        <div className="max-w-6xl mx-auto">
          <p className="text-center mono-tag">Real people at the Camp</p>
          <h2 className="display-tight text-2xl sm:text-3xl font-semibold text-ink text-center mt-3">
            Built for how Nigeria actually works
          </h2>
          <p className="text-slate text-center mt-3 max-w-2xl mx-auto">
            Three doors into the same trust network — members hire, artisans earn with proof, parish
            leadership sees everything.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-5 lg:gap-6">
            {PERSONAS.map((persona) => (
              <PersonaCard key={persona.role} {...persona} />
            ))}
          </div>
        </div>
      </section>

      <section id="views" className="px-4 py-16 sm:py-24 border-t border-hairline/80">
        <div className="max-w-5xl mx-auto">
          <p className="text-center mono-tag">One platform · three views</p>
          <h2 className="display-tight text-2xl sm:text-3xl font-semibold text-ink text-center mt-3">
            Made for everyone at the Camp
          </h2>

          <div className="role-tabs mx-auto mt-8 max-w-md">
            {AUDIENCES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAudience(id)}
                className={cn('role-tab', audience === id && 'role-tab-active')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-12 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-verdigris font-semibold text-xs uppercase tracking-wider-em">
                {feature.eyebrow}
              </p>
              <h3 className="display-tight text-2xl sm:text-3xl font-semibold text-ink mt-3 leading-snug">
                {feature.title}
              </h3>
              <p className="text-slate mt-4 leading-relaxed">{feature.subtitle}</p>
              <ul className="mt-8 space-y-4">
                {feature.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-sm text-ink leading-relaxed">
                    <span className="check-circle shrink-0 mt-0.5" aria-hidden>
                      <IconCheck className="w-3.5 h-3.5" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link to={feature.path} className="btn-pill btn-pill-primary mt-8 inline-flex">
                {feature.cta}
                <IconArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            <div className="frame p-8 sm:p-10 bg-parchment-soft/40">
              <PhoneSkeleton />
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="px-4 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 items-stretch">
          <div className="frame p-8 sm:p-10 flex flex-col justify-center">
            <p className="mono-tag text-verdigris">The demo story</p>
            <h2 className="display-tight text-2xl font-semibold text-ink mt-3">
              Bisi&apos;s generator. Tunde&apos;s hands. Pastor&apos;s oversight.
            </h2>
            <p className="text-slate mt-4 leading-relaxed">
              Saturday morning. Bisi&apos;s generator stops. She finds Tunde, funds ₦18,500 in
              escrow, and tracks the repair live. Bayo reads the job to Tunde in Pidgin. Mama Iyabo
              vouches on WhatsApp. Pastor Adekunle sees it all on the console.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              {AUDIENCES.map(({ id, label, path }) => (
                <Link
                  key={id}
                  to={path}
                  className={cn(
                    'btn-pill text-sm',
                    id === 'resident' ? 'btn-pill-primary' : 'btn-pill-secondary',
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="testimonial-card p-8 sm:p-10 flex flex-col justify-between min-h-[320px]">
            <div>
              <span className="text-5xl text-bone/20 font-display leading-none">&ldquo;</span>
              <blockquote className="text-bone text-xl sm:text-2xl font-semibold leading-snug mt-2">
                If you call me, I dey come on time, I dey work clean, and if the problem fit reach
                me, I go fix am.
              </blockquote>
            </div>
            <div className="mt-8">
              <p className="text-bone font-semibold">Tunde Akinwale</p>
              <p className="text-bone/70 text-sm mt-1">Trusted Steward · Generator tech · Mowe</p>
            </div>
            <p className="mono-tag text-bone/50 mt-6 text-[0.6rem]">01 / 03 · voice intro</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 bg-parchment-soft border-y border-hairline">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="display-tight text-2xl sm:text-3xl font-semibold text-ink">
            Pick your door. Let&apos;s get going.
          </h2>
          <p className="text-slate mt-3">
            Use the role switcher inside the demo to move between Bisi, Tunde, and Pastor Adekunle in
            one click.
          </p>
          <Link to="/member" className="btn-pill btn-pill-primary mt-8 inline-flex px-8 py-3.5">
            Start the demo
            <IconArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="py-10 px-4 text-center border-t border-hairline">
        <StewardLogo markSize={28} className="justify-center mb-4" />
        <p className="mono-tag mb-3">Kingdom Hackathon 2026 · RCCG Camp Smart City</p>
        <p className="italic-serif text-sm text-slate max-w-md mx-auto">
          Seest thou a man diligent in his business? He shall stand before kings. — Proverbs 22:29
        </p>
        <p className="text-xs text-slate/70 mt-6">
          Design polish inspired by{' '}
          <a
            href="https://www.guild.com.ng/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            Guild
          </a>
          · Diligent hands. Honest work.
        </p>
      </footer>
    </div>
  )
}
