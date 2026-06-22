import { motion, useReducedMotion } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { PAGE_TRANSITION } from '../../../lib/motion'

interface SlideOverProps {
  children: ReactNode
  title: string
  subtitle?: string
  onClose?: () => void
  className?: string
}

export function SlideOver({
  children,
  title,
  subtitle,
  onClose,
  className,
}: SlideOverProps) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const close = () => {
    if (onClose) onClose()
    else navigate(-1)
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <motion.button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-ink/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : PAGE_TRANSITION}
        onClick={close}
      />
      <motion.aside
        role="dialog"
        aria-modal
        aria-labelledby="slideover-title"
        className={cn(
          'relative w-full max-w-[480px] h-full bg-bone border-l border-hairline/80 flex flex-col shadow-lift',
          className,
        )}
        initial={{ x: reduceMotion ? 0 : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: reduceMotion ? 0 : '100%' }}
        transition={reduceMotion ? { duration: 0 } : PAGE_TRANSITION}
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-hairline/60 bg-verdigris-light/40">
          <div>
            <p className="eyebrow text-verdigris">Officer</p>
            <h2 id="slideover-title" className="display-tight text-xl font-semibold text-ink mt-1">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-slate mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 text-slate hover:text-ink rounded-pill focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seafoam"
            aria-label="Close panel"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </motion.aside>
    </div>
  )
}
