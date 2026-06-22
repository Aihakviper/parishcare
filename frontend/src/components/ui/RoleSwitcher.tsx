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
    setRole(next)
    navigate(def.homePath)
  }

  const selectRole = (id: (typeof ROLES)[number]['id']) => {
    const def = getRole(id)
    if (id === role) return
    setRole(id)
    navigate(def.homePath)
  }

  return (
    <>
      <button
        type="button"
        onClick={cycle}
        className={cn(
          'hidden sm:inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-oxblood text-bone rounded-frame text-sm font-semibold shadow-frame hover:bg-oxblood-deep transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
          className,
        )}
        aria-label={`Current role: ${current.label}. Click to switch.`}
      >
        <span className="text-bone/85 text-xs font-medium">View as</span>
        <span>{current.label}</span>
        <FaChevronRight className="w-3.5 h-3.5 opacity-80" aria-hidden />
      </button>

      <div
        className={cn('sm:hidden flex gap-1.5 overflow-x-auto -mx-1 px-1', className)}
        role="tablist"
        aria-label="Switch role"
      >
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={role === r.id}
            onClick={() => selectRole(r.id)}
            className={cn(
              'shrink-0 px-3 py-2 rounded-frame text-xs font-semibold min-h-[44px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
              role === r.id
                ? 'bg-oxblood text-bone'
                : 'bg-bone border border-hairline text-slate',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </>
  )
}
