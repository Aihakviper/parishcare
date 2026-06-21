import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { EyebrowLabel } from '../../../components/ui/EyebrowLabel'
import { Button } from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'

interface IntegrityHeroProps {
  entryCount: number
  valid: boolean
  lastCheckedAt: Date | null
  checking: boolean
  onRunCheck: () => void
}

export function IntegrityHero({
  entryCount,
  valid,
  lastCheckedAt,
  checking,
  onRunCheck,
}: IntegrityHeroProps) {
  const lastCheckLabel = lastCheckedAt
    ? formatDistanceToNow(lastCheckedAt, { addSuffix: true })
    : 'just now'

  return (
    <header className="mb-10">
      <EyebrowLabel>I · STEWARDSHIP THAT BEARS SCRUTINY</EyebrowLabel>
      <div className="mt-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        <div className="flex-1">
          <h1 className="display-tight text-3xl sm:text-4xl font-semibold text-ink">
            {checking ? 'Verifying the chain…' : valid ? 'The chain is whole.' : 'Chain anomaly detected.'}
          </h1>
          <p className="italic-serif text-lg text-slate mt-3">
            {checking
              ? 'Recomputing hashes across the full ledger…'
              : valid
                ? `${entryCount.toLocaleString()} records verified · zero broken links · last check ${lastCheckLabel}`
                : 'Integrity check failed — review the explorer for the break point.'}
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={checking}
            onClick={onRunCheck}
            className={cn(
              'mt-6 border border-oxblood/40 text-oxblood hover:bg-oxblood/5 hover:border-oxblood',
              checking && 'opacity-70',
            )}
          >
            {checking ? 'Running integrity check…' : 'Run integrity check now'}
          </Button>
        </div>

        <div className="relative flex items-center justify-center w-28 h-28 shrink-0">
          <AnimatePresence mode="wait">
            {checking ? (
              <motion.div
                key="checking"
                className="absolute inset-0 rounded-full border-2 border-verdigris/30"
                animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <>
                <motion.div
                  key="pulse"
                  className="absolute inset-0 rounded-full bg-verdigris/10"
                  initial={{ scale: 0.85, opacity: 0.5 }}
                  animate={{ scale: 1.15, opacity: 0 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.div
                  key="pulse-delay"
                  className="absolute inset-2 rounded-full bg-verdigris/10"
                  initial={{ scale: 0.9, opacity: 0.4 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: 0.8,
                  }}
                />
              </>
            )}
          </AnimatePresence>
          <motion.div
            animate={checking ? { rotate: 360 } : { rotate: 0 }}
            transition={checking ? { duration: 1.2, repeat: Infinity, ease: 'linear' } : {}}
          >
            <Check
              className={cn(
                'relative z-10',
                valid ? 'text-verdigris' : 'text-oxblood',
              )}
              style={{ width: '4rem', height: '4rem', strokeWidth: 2 }}
              aria-hidden
            />
          </motion.div>
        </div>
      </div>
    </header>
  )
}
