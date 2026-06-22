import { cn } from '../../lib/cn'

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'italic-serif text-lg sm:text-xl text-ink text-center py-10 sm:py-14 px-4 leading-relaxed',
        className,
      )}
    >
      {children}
    </p>
  )
}
