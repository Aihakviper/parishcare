import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export function Card({ children, className, hover = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'frame p-4 sm:p-5 transition-shadow duration-200',
        hover && 'hover:shadow-frame',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
