import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getRole, ROLES } from '../lib/roles'
import { useSessionStore } from '../store/session'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'
import { StoryTour, StoryTourButton } from '../components/tour/StoryTour'
import { RoleToast } from '../components/ui/RoleToast'

const ANCHOR_VERSE =
  'Look ye out among you seven men of honest report. — Acts 6:3'

export function AppLayout() {
  const { role, setRole } = useSessionStore()
  const location = useLocation()
  const current = getRole(role)

  const navItems = ROLES.map((r) => ({
    to: r.homePath,
    label: r.navLabel,
    short: r.label,
    active: role === r.id,
  }))

  return (
    <div className="min-h-screen flex flex-col">
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
            <RoleSwitcher className="shrink-0" />
          </div>

          <nav
            aria-label="Surfaces"
            className="flex gap-1 overflow-x-auto pb-0 -mb-px scrollbar-none"
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
                  `px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    item.active
                      ? 'border-oxblood text-oxblood'
                      : 'border-transparent text-slate hover:text-ink'
                  }`
                }
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="bg-parchment-soft border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
          <p className="italic-serif text-xs sm:text-sm text-slate max-w-3xl">
            {ANCHOR_VERSE}
          </p>
          <p className="mono-tag mt-1">{current.contextLabel}</p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${role}-${location.pathname}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-hairline bg-parchment-soft mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate">
          Steward · Verification, coordination, and visibility for parish welfare
        </div>
      </footer>

      <RoleToast />
      <StoryTourButton />
      <StoryTour />
    </div>
  )
}
