import { Check, Loader2 } from 'lucide-react'
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

        <div
          className="relative flex items-center justify-center w-28 h-28 shrink-0"
          aria-live="polite"
          aria-label={checking ? 'Verifying chain integrity' : valid ? 'Chain verified intact' : 'Chain integrity failed'}
        >
          {checking ? (
            <Loader2
              className="w-14 h-14 text-verdigris animate-spin"
              style={{ animationDuration: '1.2s' }}
              aria-hidden
            />
          ) : (
            <Check
              className={cn(valid ? 'text-verdigris' : 'text-oxblood')}
              style={{ width: '4rem', height: '4rem', strokeWidth: 2 }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </header>
  )
}
