import { cn } from '../../lib/cn'

export function EmptyState({
  message,
  className,
}: {
  message: string
  className?: string
}) {
  return (
    <p className={cn('italic-serif text-slate text-center py-12 px-4', className)}>
      {message}
    </p>
  )
}
