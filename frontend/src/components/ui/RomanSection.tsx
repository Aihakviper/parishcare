import type { ReactNode } from 'react'

interface RomanSectionProps {
  numeral: 'I' | 'II' | 'III' | 'IV' | 'V'
  title: string
  subtitle?: string
  children?: ReactNode
}

export function RomanSection({ numeral, title, subtitle, children }: RomanSectionProps) {
  return (
    <section className="mb-6 sm:mb-8">
      <header className="mb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="italic-serif text-2xl sm:text-3xl text-gilt">{numeral}</span>
          <h1 className="display-tight text-xl sm:text-2xl font-semibold text-ink">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-slate text-sm sm:text-base max-w-2xl pl-8 sm:pl-10">
            {subtitle}
          </p>
        )}
        <div className="gilt-rule mt-4" />
      </header>
      {children}
    </section>
  )
}
