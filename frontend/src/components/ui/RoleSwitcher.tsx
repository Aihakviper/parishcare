import { ChevronRight } from 'lucide-react'
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
      {/* Desktop: compact cycle control */}
      <button
        type="button"
        onClick={cycle}
        className={cn(
          'hidden sm:inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-oxblood text-bone rounded-full text-sm font-semibold shadow-frame hover:bg-oxblood-deep transition-colors duration-150 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
          className,
        )}
        aria-label={`Current role: ${current.label}. Click to switch to next role.`}
      >
        <span className="mono-tag text-bone/70">View as</span>
        <span className="display text-sm sm:text-base leading-none">{current.label}</span>
        <ChevronRight className="w-4 h-4 opacity-70 shrink-0" aria-hidden />
      </button>

      {/* Mobile: horizontal role pills */}
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
              'shrink-0 px-3 py-2 rounded-full text-xs font-semibold min-h-[40px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt',
              role === r.id
                ? 'bg-oxblood text-bone'
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
