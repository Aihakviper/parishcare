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
  const isFirstRender = useRef(true)
  const [displayPct, setDisplayPct] = useState(() => (reduceMotion ? percentUsed : 0))
  const [animDone, setAnimDone] = useState(() => Boolean(reduceMotion))

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (!reduceMotion) {
        const show = window.setTimeout(() => setDisplayPct(percentUsed), 60)
        const done = window.setTimeout(() => setAnimDone(true), 780)
        return () => {
          window.clearTimeout(show)
          window.clearTimeout(done)
        }
      }
      return
    }
    setDisplayPct(percentUsed)
  }, [percentUsed, reduceMotion])

  const data = [{ name: 'used', value: displayPct, fill: '#2A6B5A' }]

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
            background={{ fill: '#E8F5F1' }}
            dataKey="value"
            cornerRadius={4}
            max={100}
            isAnimationActive={!animDone}
            animationDuration={animDone ? 0 : 700}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="display-tight text-2xl font-semibold text-verdigris tabular-nums">
          {displayPct}%
        </span>
        <span className="mono-tag text-[0.55rem] text-center leading-tight px-1">
          {label}
        </span>
      </div>
    </div>
  )
}
