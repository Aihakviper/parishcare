import { cn } from '../../lib/cn'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const

export function RomanSection({
  index,
  title,
  className,
}: {
  index: number
  title: string
  className?: string
}) {
  const numeral = ROMAN[index] ?? String(index + 1)
  return (
    <p className={cn('italic-serif text-gilt text-sm tracking-roman', className)}>
      {numeral} · {title}
    </p>
  )
}
