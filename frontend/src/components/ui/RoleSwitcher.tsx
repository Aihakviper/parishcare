import { FaChevronRight } from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'
import { getRole, nextRole, ROLES } from '../../lib/roles'
import { useSessionStore } from '../../store/session'
import { cn } from '../../lib/cn'

export function RoleSwitcher({ className }: { className?: string }) {
  const { role, setRole } = useSessionStore()
  const navigate = useNavigate()
  const current = getRole(role)

  const cycle = () => {
    const next = nextRole(role)
    const def = getRole(next)
    setRole(next, `Now viewing as ${def.label} — ${def.contextLabel}`)
    navigate(def.homePath)
  }

  const selectRole = (id: (typeof ROLES)[number]['id']) => {
    const def = getRole(id)
    if (id === role) return
    setRole(id, `Now viewing as ${def.label} — ${def.contextLabel}`)
    navigate(def.homePath)
  }

  return (
    <>
      <button
        type="button"
        onClick={cycle}
        className={cn(
          'hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-seafoam text-bone rounded-pill text-sm font-semibold shadow-card hover:bg-seafoam-deep transition-colors duration-150 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam',
          className,
        )}
        aria-label={`Current role: ${current.label}. Click to switch to next role.`}
      >
        <span className="text-bone/85 text-xs font-medium">View as</span>
        <span className="leading-none">{current.label}</span>
        <FaChevronRight className="w-4 h-4 opacity-80 shrink-0" aria-hidden />
      </button>

      <div
        className={cn('sm:hidden flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1', className)}
        role="tablist"
        aria-label="Switch role"
      >
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-current={role === r.id ? 'page' : undefined}
            aria-selected={role === r.id}
            onClick={() => selectRole(r.id)}
            className={cn(
              'shrink-0 px-3.5 py-2 rounded-pill text-xs font-semibold min-h-[40px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam',
              role === r.id
                ? 'bg-seafoam text-bone shadow-card'
                : 'bg-bone border border-hairline text-slate hover:text-ink',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </>
  )
}
