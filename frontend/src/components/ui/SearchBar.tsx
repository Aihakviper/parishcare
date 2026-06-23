import { IconMicrophone } from '../../lib/icons'
import { cn } from '../../lib/cn'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search artisans or trades…',
  onVoice,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onVoice?: () => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[48px] pl-4 pr-12 py-3 rounded-frame border border-hairline bg-bone text-ink placeholder:text-slate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
      />
      {onVoice && (
        <button
          type="button"
          onClick={onVoice}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-oxblood text-bone flex items-center justify-center hover:bg-oxblood-deep transition-colors"
          aria-label="Search by voice"
        >
          <IconMicrophone className="w-4 h-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
