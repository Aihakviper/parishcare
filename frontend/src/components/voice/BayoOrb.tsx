import { cn } from '../../lib/cn'
import { useVoiceStore, type VoiceAgentState } from '../../store/voice'

export function BayoOrb({
  className,
  state,
}: {
  className?: string
  state?: VoiceAgentState
}) {
  const storeState = useVoiceStore((s) => s.agentState)
  const agentState = state ?? storeState

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-oxblood to-oxblood-deep shadow-lift',
        agentState === 'idle' && 'animate-[bayo-breathe_2.4s_ease-in-out_infinite]',
        agentState === 'speaking' && 'ring-2 ring-gilt/50 ring-offset-2',
        agentState === 'recording' && 'scale-105',
        className ?? 'w-28 h-28',
      )}
      aria-hidden
    >
      <div className="absolute inset-1 rounded-full border border-gilt/30" />
      <span className="display text-bone text-2xl font-semibold">B</span>
    </div>
  )
}
