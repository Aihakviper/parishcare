import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FaBriefcase, FaChartLine, FaHouse, FaUser, FaWallet } from 'react-icons/fa6'
import { StewardMark } from '../components/ui/StewardMark'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'
import { RoleToast } from '../components/ui/RoleToast'
import { BayoFab, BayoPanel } from '../components/voice/BayoPanel'
import { PAGE_TRANSITION } from '../lib/motion'
import { cn } from '../lib/cn'

const nav = [
  { to: '/artisan', icon: FaHouse, label: 'Home' },
  { to: '/artisan/jobs/hero', icon: FaBriefcase, label: 'Active' },
  { to: '/artisan/earnings', icon: FaWallet, label: 'Earnings' },
  { to: '/artisan/standing', icon: FaChartLine, label: 'Standing' },
  { to: '/artisan/profile', icon: FaUser, label: 'Me' },
]

export function ArtisanLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-parchment pb-24 max-w-lg mx-auto w-full">
      <header className="sticky top-0 z-40 bg-parchment/95 backdrop-blur border-b border-hairline px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StewardMark />
          <span className="display-tight text-lg font-semibold text-ink">Steward</span>
        </div>
        <RoleSwitcher />
      </header>

      <main className="flex-1 px-4 py-6 min-w-0">
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

      <nav
        aria-label="Artisan navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-parchment-soft border-t border-hairline max-w-lg mx-auto"
      >
        <ul className="flex justify-around">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/artisan'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-[0.65rem] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gilt',
                    isActive ? 'text-oxblood' : 'text-slate',
                  )
                }
              >
                <Icon className="w-5 h-5" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <BayoFab />
      <BayoPanel />
      <RoleToast />
    </div>
  )
}
