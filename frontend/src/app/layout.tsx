import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FaBars, FaXmark } from 'react-icons/fa6'
import { getRole, ROLES } from '../lib/roles'
import { PAGE_TRANSITION } from '../lib/motion'
import { useSessionStore } from '../store/session'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'
import { StewardMark } from '../components/ui/StewardMark'
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
      <header className="sticky top-0 z-50 bg-bone/95 backdrop-blur-md shadow-card border-b border-hairline/60">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-4 sm:py-5">
            <NavLink to="/officer" className="flex items-center gap-3 min-w-0 group">
              <StewardMark />
              <span className="display-tight text-lg sm:text-xl font-semibold text-ink tracking-tight group-hover:text-verdigris transition-colors">
                Steward
              </span>
            </NavLink>

            <nav
              aria-label="Surfaces"
              className="hidden md:flex items-center gap-1"
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
                      'px-4 py-2 text-sm font-medium rounded-pill transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam',
                      item.active
                        ? 'bg-verdigris-light text-verdigris'
                        : 'text-slate hover:text-ink hover:bg-parchment-soft',
                    )
                  }
                >
                  {item.short}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <RoleSwitcher className="hidden sm:flex" />
              <button
                type="button"
                className="md:hidden p-2.5 rounded-pill border border-hairline bg-bone text-ink min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-surface-nav"
                aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileNavOpen ? (
                  <FaXmark className="w-5 h-5" aria-hidden />
                ) : (
                  <FaBars className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className="sm:hidden pb-3">
            <RoleSwitcher />
          </div>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.nav
              id="mobile-surface-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={PAGE_TRANSITION}
              className="md:hidden border-t border-hairline/60 bg-bone overflow-hidden"
              aria-label="Surfaces"
            >
              <ul className="max-w-content mx-auto px-4 py-2">
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
                          'block py-3.5 text-sm font-medium border-b border-hairline/50 last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam',
                          item.active ? 'text-verdigris' : 'text-slate',
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

      <div className="border-b border-hairline/40 bg-verdigris-light/30">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p className="italic-serif text-xs sm:text-sm text-slate">
            {ANCHOR_VERSE}
          </p>
          <p className="mono-tag text-[0.62rem] sm:text-right">{current.contextLabel}</p>
        </div>
      </div>

      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
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

      <footer className="border-t border-hairline/60 bg-bone mt-auto">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-slate font-medium tracking-wide">
            Built for the Kingdom Hackathon · 2026
          </p>
          <p className="italic-serif text-sm text-slate mt-3 max-w-md mx-auto leading-relaxed">
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
