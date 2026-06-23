import { NavLink, Outlet } from 'react-router-dom'
import { IconBriefcase, IconHouse, IconStar, IconUser } from '../lib/icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { StewardLogo } from '../components/ui/StewardLogo'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'
import { RoleToast } from '../components/ui/RoleToast'
import { PAGE_TRANSITION } from '../lib/motion'
import { cn } from '../lib/cn'

const nav = [
  { to: '/member', icon: IconHouse, label: 'Home' },
  { to: '/member/jobs', icon: IconBriefcase, label: 'Jobs' },
  { to: '/member/discover', icon: IconStar, label: 'Saved' },
  { to: '/member/me', icon: IconUser, label: 'Me' },
]

export function ResidentLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-parchment pb-20 max-w-lg mx-auto w-full">
      <header className="sticky top-0 z-40 bg-parchment/95 backdrop-blur border-b border-hairline px-4 py-3 flex items-center justify-between gap-3">
        <StewardLogo markSize={28} />
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
        aria-label="Member navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-parchment-soft border-t border-hairline max-w-lg mx-auto"
      >
        <ul className="flex justify-around">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/member'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 py-3 min-h-[56px] text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gilt',
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

      <RoleToast />
    </div>
  )
}
