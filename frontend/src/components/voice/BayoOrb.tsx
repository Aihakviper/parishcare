import { cn } from '../../lib/cn'
import { useVoiceStore } from '../../store/voice'

export function BayoOrb({ className }: { className?: string }) {
  const agentState = useVoiceStore((s) => s.agentState)

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-oxblood to-oxblood-deep shadow-lift',
        agentState === 'idle' && 'animate-[bayo-breathe_2.4s_ease-in-out_infinite]',
        className ?? 'w-28 h-28',
      )}
      aria-hidden
    >
      <div className="absolute inset-1 rounded-full border border-gilt/30" />
      <span className="display text-bone text-2xl font-semibold">B</span>
    </div>
  )
}
