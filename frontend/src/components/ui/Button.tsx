import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-bone hover:bg-ink/90 border border-ink shadow-card',
  accent:
    'bg-seafoam text-bone hover:bg-seafoam-deep border border-seafoam shadow-card',
  secondary:
    'bg-bone text-ink border border-hairline hover:border-verdigris/30 hover:shadow-card',
  ghost: 'bg-transparent text-slate hover:text-ink border border-transparent',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-pill transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
