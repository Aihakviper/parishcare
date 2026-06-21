import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { getRole, ROLES } from '../lib/roles'
import { PAGE_TRANSITION } from '../lib/motion'
import { useSessionStore } from '../store/session'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'
import { StoryTour, StoryTourButton } from '../components/tour/StoryTour'
import { RoleToast } from '../components/ui/RoleToast'
import { cn } from '../lib/cn'

const ANCHOR_VERSE =
  'Look ye out among you seven men of honest report. — Acts 6:3'

export function AppLayout() {
  const { role, setRole } = useSessionStore()
  const location = useLocation()
  const current = getRole(role)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navItems = ROLES.map((r) => ({
    to: r.homePath,
    label: r.navLabel,
    short: r.label,
    active: role === r.id,
  }))

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-hairline bg-bone/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-oxblood rounded-sm flex items-center justify-center"
                aria-hidden
              >
                <span className="display text-xl sm:text-2xl text-bone leading-none">
                  S
                </span>
              </div>
              <div className="min-w-0">
                <p className="eyebrow text-gilt">Steward</p>
                <p className="display-tight text-base sm:text-lg font-semibold text-ink truncate">
                  The ledger of grace, kept honest.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RoleSwitcher className="hidden sm:flex" />
              <button
                type="button"
                className="sm:hidden p-2.5 rounded-frame border border-hairline bg-bone text-ink min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-surface-nav"
                aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileNavOpen ? (
                  <X className="w-5 h-5" aria-hidden />
                ) : (
                  <Menu className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {/* Mobile role pills */}
          <div className="sm:hidden pb-3">
            <RoleSwitcher />
          </div>

          {/* Desktop surface nav */}
          <nav
            aria-label="Surfaces"
            className="hidden sm:flex gap-1 overflow-x-auto pb-0 -mb-px scrollbar-none"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  const target = ROLES.find((r) => r.homePath === item.to)
                  if (target) setRole(target.id)
                }}
                className={() =>
                  cn(
                    'px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
                    item.active
                      ? 'border-oxblood text-oxblood'
                      : 'border-transparent text-slate hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Mobile hamburger drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.nav
              id="mobile-surface-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={PAGE_TRANSITION}
              className="sm:hidden border-t border-hairline bg-bone overflow-hidden"
              aria-label="Surfaces"
            >
              <ul className="max-w-6xl mx-auto px-4 py-2">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => {
                        const target = ROLES.find((r) => r.homePath === item.to)
                        if (target) setRole(target.id)
                        closeMobileNav()
                      }}
                      className={() =>
                        cn(
                          'block py-3 text-sm font-medium border-b border-hairline/60 last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
                          item.active ? 'text-oxblood' : 'text-slate',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <div className="bg-parchment-soft border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
          <p className="italic-serif text-xs sm:text-sm text-slate max-w-3xl">
            {ANCHOR_VERSE}
          </p>
          <p className="mono-tag mt-1">{current.contextLabel}</p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${role}-${location.pathname}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PAGE_TRANSITION}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-hairline bg-parchment-soft mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-center sm:text-left">
          <p className="text-xs text-slate font-medium tracking-wide">
            Built for the Kingdom Hackathon · 2026
          </p>
          <p className="italic-serif text-xs sm:text-sm text-slate mt-2 max-w-xl">
            {ANCHOR_VERSE}
          </p>
        </div>
      </footer>

      <RoleToast />
      <StoryTourButton />
      <StoryTour />
    </div>
  )
}
