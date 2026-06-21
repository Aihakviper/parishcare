import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: '/provincial', label: 'Dashboard', end: true },
  { to: '/provincial/parishes', label: 'Parishes', end: false },
  { to: '/provincial/map', label: 'Map', end: false },
]

export function ProvincialLayout() {
  return (
    <div>
      <nav
        aria-label="Provincial sections"
        className="flex gap-1 mb-6 border-b border-hairline -mx-1"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-verdigris text-verdigris'
                  : 'border-transparent text-slate hover:text-ink',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
