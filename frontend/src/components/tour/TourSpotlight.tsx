import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PAGE_TRANSITION } from '../../lib/motion'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface TourSpotlightProps {
  targetSelector: string | null
  active: boolean
}

const PAD = 10

export function TourSpotlight({ targetSelector, active }: TourSpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!active || !targetSelector) {
      setRect(null)
      return
    }

    const update = () => {
      const el = document.querySelector(targetSelector)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      })
      el.classList.add('tour-highlight')
    }

    update()
    const t = window.setTimeout(update, 350)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.querySelectorAll('.tour-highlight').forEach((n) => {
        n.classList.remove('tour-highlight')
      })
    }
  }, [active, targetSelector])

  if (!active || !rect) return null

  return (
    <motion.div
      key={targetSelector}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={PAGE_TRANSITION}
      className="fixed z-[90] pointer-events-none rounded-frame ring-2 ring-verdigris/60"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        boxShadow: '0 0 0 9999px rgba(245, 240, 229, 0.72)',
      }}
      aria-hidden
    />
  )
}
