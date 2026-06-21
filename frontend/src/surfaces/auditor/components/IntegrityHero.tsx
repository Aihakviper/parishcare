import { FaCheck, FaSpinner } from 'react-icons/fa6'
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

  const heading = checking
    ? 'Verifying the chain…'
    : valid
      ? 'The chain is whole.'
      : 'Chain anomaly detected.'

  const lead = checking
    ? 'Recomputing hashes across the full ledger…'
    : valid
      ? `${entryCount.toLocaleString()} records verified · zero broken links · last check ${lastCheckLabel}`
      : 'Integrity check failed — review the explorer for the break point.'

  return (
    <header className="mb-12 sm:mb-14">
      <div className="hero-spotlight">
        <EyebrowLabel className="text-seafoam">I · STEWARDSHIP THAT BEARS SCRUTINY</EyebrowLabel>

        <div
          className={cn(
            'mx-auto mt-8 mb-6 flex items-center justify-center w-24 h-24 rounded-full',
            valid && !checking ? 'bg-verdigris-light' : 'bg-parchment-soft',
          )}
          aria-live="polite"
          aria-label={
            checking
              ? 'Verifying chain integrity'
              : valid
                ? 'Chain verified intact'
                : 'Chain integrity failed'
          }
        >
          {checking ? (
            <FaSpinner
              className="w-12 h-12 text-seafoam animate-spin"
              style={{ animationDuration: '1.2s' }}
              aria-hidden
            />
          ) : (
            <FaCheck
              className={cn(valid ? 'text-verdigris' : 'text-oxblood', 'w-[3.25rem] h-[3.25rem]')}
              aria-hidden
            />
          )}
        </div>

        <h1>{heading}</h1>
        <p className="hero-lead italic-serif">{lead}</p>

        <div className="mt-8">
          <Button
            type="button"
            variant="accent"
            disabled={checking}
            onClick={onRunCheck}
            className={cn('btn-pill min-w-[220px]', checking && 'opacity-70')}
          >
            {checking ? 'Running integrity check…' : 'Run integrity check now'}
          </Button>
        </div>
      </div>
    </header>
  )
}
