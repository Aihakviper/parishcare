import { AnimatePresence, motion } from 'framer-motion'
import { FaMicrophone, FaXmark } from 'react-icons/fa6'
import { BayoOrb } from './BayoOrb'
import { TranscriptBubble } from './TranscriptBubble'
import { useVoiceStore } from '../../store/voice'
import { useVoiceAgent } from '../../hooks/useVoiceAgent'
import { PAGE_TRANSITION } from '../../lib/motion'

const QUICK = [
  { id: 'jobs', label: 'Read me new jobs' },
  { id: 'balance', label: "What's my balance?" },
  { id: 'standing', label: 'How am I doing?' },
  { id: 'end', label: 'End' },
]

export function BayoPanel() {
  const panelOpen = useVoiceStore((s) => s.panelOpen)
  const closePanel = useVoiceStore((s) => s.closePanel)
  const transcript = useVoiceStore((s) => s.transcript)
  const agentState = useVoiceStore((s) => s.agentState)
  const { startRecording, stopRecording, quickAction } = useVoiceAgent()

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close Bayo"
            className="fixed inset-0 z-[70] bg-ink/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PAGE_TRANSITION}
            onClick={closePanel}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-label="Bayo voice agent"
            className="fixed inset-x-0 bottom-0 z-[75] max-h-[85vh] sm:max-h-[80vh] bg-bone rounded-t-2xl border-t border-hairline shadow-lift flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={PAGE_TRANSITION}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-hairline shrink-0">
              <p className="mono-tag">Bayo · Pidgin</p>
              <button
                type="button"
                onClick={closePanel}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-frame text-slate hover:text-ink"
                aria-label="Close panel"
              >
                <FaXmark aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0" role="log" aria-live="polite">
              <div className="flex justify-center py-2">
                <BayoOrb state={agentState} />
              </div>
              {transcript.map((line) => (
                <TranscriptBubble key={line.id} role={line.role} text={line.text} />
              ))}
              {agentState === 'processing' && (
                <p className="italic-serif text-gilt text-sm text-center">Bayo dey think…</p>
              )}
            </div>

            <div className="shrink-0 px-4 pb-6 pt-2 border-t border-hairline bg-parchment-soft/50">
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {QUICK.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => quickAction(q.id)}
                    className="mono-tag px-2.5 py-1 rounded-full border border-hairline bg-bone hover:border-oxblood/30 text-[0.6rem]"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
                className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full text-bone shadow-lift transition-colors ${
                  agentState === 'recording' ? 'bg-oxblood-deep scale-105' : 'bg-oxblood hover:bg-oxblood-deep'
                }`}
                aria-label="Hold to talk to Bayo"
              >
                <FaMicrophone className="w-6 h-6" aria-hidden />
              </button>
              <p className="text-center text-xs text-slate mt-2">Hold to talk</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function BayoFab() {
  const openPanel = useVoiceStore((s) => s.openPanel)

  return (
    <button
      type="button"
      onClick={openPanel}
      className="fixed bottom-20 right-4 z-[50] w-14 h-14 rounded-full bg-oxblood text-bone shadow-lift flex items-center justify-center hover:bg-oxblood-deep transition-colors md:bottom-6"
      aria-label="Talk to Bayo"
    >
      <FaMicrophone className="w-5 h-5" aria-hidden />
    </button>
  )
}
