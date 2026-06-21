import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useDemoStore } from '../../store/demo'
import { Button } from './Button'
import { Card } from './Card'
import { EyebrowLabel } from './EyebrowLabel'

const TOUR_STEPS = [
  'Meet the Officer queue — where care requests begin.',
  'Switch roles instantly — no logout required.',
  'Follow Ngozi Okafor from intake to disbursement.',
  'Verify the audit chain before the judges.',
]

export function DemoTourPopover() {
  const { tourActive, tourStep, setTourStep, endTour } = useDemoStore()

  if (!tourActive) return null

  const isLast = tourStep >= TOUR_STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/30"
        onClick={endTour}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card hover={false} className="relative">
            <button
              type="button"
              onClick={endTour}
              className="absolute top-3 right-3 p-1 text-slate hover:text-ink"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
            <EyebrowLabel>Guided tour</EyebrowLabel>
            <p className="display text-lg text-ink mt-2 pr-6">
              {TOUR_STEPS[tourStep]}
            </p>
            <p className="mono-tag mt-3">
              Step {tourStep + 1} of {TOUR_STEPS.length}
            </p>
            <div className="flex gap-2 mt-4">
              {!isLast ? (
                <Button onClick={() => setTourStep(tourStep + 1)}>Continue</Button>
              ) : (
                <Button
                  onClick={() => {
                    endTour()
                  }}
                >
                  Begin demo
                </Button>
              )}
              <Button variant="ghost" onClick={endTour}>
                Skip
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function GuidedTourButton() {
  const startTour = useDemoStore((s) => s.startTour)

  return (
    <button
      type="button"
      onClick={() => startTour()}
      className="fixed bottom-4 right-4 z-40 px-4 py-3 bg-bone border border-hairline rounded-full shadow-frame text-sm font-semibold text-oxblood hover:border-oxblood/40 transition-colors min-h-[44px]"
    >
      Guided Tour
    </button>
  )
}
