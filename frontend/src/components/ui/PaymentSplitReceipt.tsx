import { formatNaira } from '../../lib/formatters'
import type { PaymentSplit } from '../../lib/types/camp'
import { cn } from '../../lib/cn'

export function PaymentSplitReceipt({
  split,
  reference,
  className,
}: {
  split: PaymentSplit
  reference?: string
  className?: string
}) {
  const rows = [
    { label: 'Artisan', amount: split.artisanKobo, tone: 'text-ink' },
    { label: 'Ops', amount: split.opsKobo, tone: 'text-slate' },
    { label: 'Stewards Fund', amount: split.fundKobo, tone: 'text-verdigris' },
  ]

  return (
    <div className={cn('frame p-4 space-y-3', className)}>
      <p className="mono-tag">Payment split</p>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-sm">
          <span className={r.tone}>{r.label}</span>
          <span className="font-semibold">{formatNaira(r.amount)}</span>
        </div>
      ))}
      <div className="gilt-rule" />
      <div className="flex justify-between font-semibold text-ink">
        <span>Total</span>
        <span>{formatNaira(split.totalKobo)}</span>
      </div>
      {reference && <p className="mono-tag text-[0.6rem]">{reference}</p>}
      <p className="italic-serif text-xs text-slate">This trains the next pair of hands.</p>
    </div>
  )
}
