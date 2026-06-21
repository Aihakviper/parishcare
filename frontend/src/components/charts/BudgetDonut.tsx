import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

interface BudgetDonutProps {
  /** 0–100 */
  percentUsed: number
  label?: string
}

export function BudgetDonut({ percentUsed, label = 'Budget used' }: BudgetDonutProps) {
  const reduceMotion = useReducedMotion()
  const hasAnimated = useRef(false)
  const [displayPct, setDisplayPct] = useState(reduceMotion ? percentUsed : 0)
  const [animDone, setAnimDone] = useState(reduceMotion)

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplayPct(percentUsed)
      return
    }
    hasAnimated.current = true
    if (reduceMotion) {
      setDisplayPct(percentUsed)
      setAnimDone(true)
      return
    }
    const show = window.setTimeout(() => setDisplayPct(percentUsed), 60)
    const done = window.setTimeout(() => setAnimDone(true), 780)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(done)
    }
  }, [percentUsed, reduceMotion])

  const data = [{ name: 'used', value: displayPct, fill: '#5B1A1A' }]

  return (
    <div
      className="relative w-32 h-32 mx-auto"
      role="img"
      aria-label={`${label}: ${percentUsed} percent`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="68%"
          outerRadius="100%"
          barSize={9}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background={{ fill: '#EFE9DA' }}
            dataKey="value"
            cornerRadius={4}
            max={100}
            isAnimationActive={!animDone}
            animationDuration={animDone ? 0 : 700}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="display-tight text-2xl font-semibold text-oxblood tabular-nums">
          {displayPct}%
        </span>
        <span className="mono-tag text-[0.55rem] text-center leading-tight px-1">
          {label}
        </span>
      </div>
    </div>
  )
}
