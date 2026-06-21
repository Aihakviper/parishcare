import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: '/auditor', label: 'Dashboard', end: true },
  { to: '/auditor/chain', label: 'Chain explorer', end: false },
  { to: '/auditor/report', label: 'Audit report', end: false },
]

export function AuditorLayout() {
  return (
    <div>
      <nav
        aria-label="Auditor sections"
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
