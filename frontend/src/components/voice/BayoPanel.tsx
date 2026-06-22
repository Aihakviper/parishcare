import { AnimatePresence, motion } from 'framer-motion'
import { FaMicrophone, FaXmark } from 'react-icons/fa6'
import { BayoOrb } from './BayoOrb'
import { VoiceRecorder } from './VoiceRecorder'
import { useVoiceStore } from '../../store/voice'
import { PAGE_TRANSITION } from '../../lib/motion'

export function BayoPanel() {
  const panelOpen = useVoiceStore((s) => s.panelOpen)
  const closePanel = useVoiceStore((s) => s.closePanel)

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
            className="fixed inset-x-0 bottom-0 z-[75] max-h-[80vh] bg-bone rounded-t-2xl border-t border-hairline shadow-lift flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={PAGE_TRANSITION}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-hairline">
              <p className="mono-tag">Bayo · voice agent</p>
              <button
                type="button"
                onClick={closePanel}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-frame text-slate hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
                aria-label="Close panel"
              >
                <FaXmark aria-hidden />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center gap-6">
              <BayoOrb />
              <p className="italic-serif text-slate text-center max-w-sm">
                Bayo dey here. Voice conversations land in PROMPT 6.
              </p>
              <div className="w-full max-w-md frame p-4 min-h-[120px]">
                <VoiceRecorder />
              </div>
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
      className="fixed bottom-20 right-4 z-[50] w-14 h-14 rounded-full bg-oxblood text-bone shadow-lift flex items-center justify-center hover:bg-oxblood-deep transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt md:bottom-6"
      aria-label="Talk to Bayo"
    >
      <FaMicrophone className="w-5 h-5" aria-hidden />
    </button>
  )
}
