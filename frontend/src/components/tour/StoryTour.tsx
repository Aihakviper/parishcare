import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { EyebrowLabel } from '../ui/EyebrowLabel'
import { TourSpotlight } from './TourSpotlight'
import { useTourDriver } from './useTourDriver'
import { useTourStore } from '../../store/tour'
import { TOUR_STEPS } from '../../lib/tour/steps'

export function StoryTour() {
  const active = useTourStore((s) => s.active)
  const step = useTourStore((s) => s.step)
  const paused = useTourStore((s) => s.paused)
  const showFinal = useTourStore((s) => s.showFinal)
  const nextStep = useTourStore((s) => s.nextStep)
  const togglePaused = useTourStore((s) => s.togglePaused)
  const { finishTour, handleExitEarly, restartTour, reduceMotion } = useTourDriver()

  if (!active) return null

  const current = TOUR_STEPS[step]
  const target = showFinal ? null : (current?.target ?? null)

  return (
    <>
      <TourSpotlight targetSelector={target} active={active && !showFinal} />

      <div className="fixed inset-0 z-[95] pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={showFinal ? 'final' : `step-${step}`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md"
          >
            <div className="frame bg-bone/98 backdrop-blur-md shadow-frame border-oxblood/15 p-5 sm:p-6">
              {showFinal ? (
                <>
                  <EyebrowLabel>Steward</EyebrowLabel>
                  <p className="display text-lg sm:text-xl text-ink mt-2 leading-snug">
                    This is Steward.
                  </p>
                  <p className="italic-serif text-base text-slate mt-3 leading-relaxed">
                    Not a new system. The oldest one, given the tools it deserves.
                  </p>
                  <p className="italic-serif text-sm text-gilt mt-4">— Acts 6:3</p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <Button type="button" onClick={restartTour}>
                      Restart tour
                    </Button>
                    <Button type="button" variant="secondary" onClick={finishTour}>
                      Explore freely
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <EyebrowLabel>
                      Step {step + 1} of {TOUR_STEPS.length}
                    </EyebrowLabel>
                    <button
                      type="button"
                      onClick={() => {
                        finishTour()
                      }}
                      className="p-1 text-slate hover:text-ink shrink-0"
                      aria-label="Exit tour"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="display text-base sm:text-lg text-ink mt-2 leading-snug">
                    {current?.narration}
                  </p>
                  <p className="mono-tag mt-3">
                    {reduceMotion
                      ? 'Step-by-step · reduced motion'
                      : paused
                        ? 'Paused'
                        : 'Auto-advancing · ~90 seconds total'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button type="button" onClick={nextStep}>
                      Next
                    </Button>
                    {!reduceMotion && (
                      <Button type="button" variant="secondary" onClick={togglePaused}>
                        {paused ? (
                          <>
                            <Play className="w-3.5 h-3.5" /> Resume
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleExitEarly}
                      className="text-slate"
                    >
                      Exit tour
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

export function StoryTourButton() {
  const startTour = useTourStore((s) => s.startTour)
  const active = useTourStore((s) => s.active)

  if (active) return null

  return (
    <button
      type="button"
      onClick={() => startTour()}
      className="fixed bottom-4 right-4 z-[80] px-5 py-3 bg-oxblood text-bone rounded-full shadow-frame text-sm font-semibold hover:bg-oxblood-deep transition-colors min-h-[44px]"
    >
      ▶ Watch the story
    </button>
  )
}
