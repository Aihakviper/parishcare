import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRole, nextRole } from '../../lib/roles'
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

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        'inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-oxblood text-bone rounded-full text-sm font-semibold shadow-frame hover:bg-oxblood-deep transition-colors duration-150 min-h-[44px]',
        className,
      )}
      aria-label={`Current role: ${current.label}. Click to switch.`}
    >
      <span className="mono-tag text-bone/70 hidden xs:inline">View as</span>
      <span className="display text-sm sm:text-base leading-none">{current.label}</span>
      <ChevronRight className="w-4 h-4 opacity-70 shrink-0" aria-hidden />
    </button>
  )
}
