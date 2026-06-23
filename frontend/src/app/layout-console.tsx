import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { IconList, IconClose } from '../lib/icons'
import { StewardLogo } from '../components/ui/StewardLogo'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'
import { RoleToast } from '../components/ui/RoleToast'
import { PAGE_TRANSITION } from '../lib/motion'
import { cn } from '../lib/cn'

const nav = [
  { to: '/console', label: 'Overview', end: true },
  { to: '/console/artisans', label: 'Artisans' },
  { to: '/console/hands', label: 'Hands' },
  { to: '/console/standing', label: 'Standing' },
  { to: '/console/jobs', label: 'Jobs' },
  { to: '/console/disputes', label: 'Disputes' },
  { to: '/console/lineage', label: 'Lineage' },
  { to: '/console/patterns', label: 'Patterns' },
]

export function ConsoleLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-parchment">
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-hairline bg-bone">
        <div className="p-5 border-b border-hairline">
          <StewardLogo markSize={28} />
        </div>
        <nav aria-label="Console" className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'block px-3 py-2.5 rounded-frame text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
                  isActive
                    ? 'bg-parchment-soft text-oxblood'
                    : 'text-slate hover:text-ink hover:bg-parchment-soft/60',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="p-4 mono-tag text-[0.6rem] border-t border-hairline">
          Camp · RCCG Mowe
        </p>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-bone/95 backdrop-blur border-b border-hairline px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-frame border border-hairline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <IconClose aria-hidden /> : <IconList aria-hidden />}
            </button>
            <p className="display-tight text-lg font-semibold text-ink">Parish Console</p>
          </div>
          <RoleSwitcher />
        </header>

        {mobileOpen && (
          <nav
            aria-label="Console mobile"
            className="lg:hidden border-b border-hairline bg-bone px-4 py-2"
          >
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-medium text-slate border-b border-hairline/50 last:border-0"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <main className="flex-1 p-4 sm:p-8 min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={PAGE_TRANSITION}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <RoleToast />
    </div>
  )
}
