import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

interface PriorityGaugeProps {
  score: number
}

export function PriorityGauge({ score }: PriorityGaugeProps) {
  const reduceMotion = useReducedMotion()
  const [animated, setAnimated] = useState(reduceMotion ? score : 0)

  useEffect(() => {
    if (reduceMotion) {
      setAnimated(score)
      return
    }
    const t = window.setTimeout(() => setAnimated(score), 80)
    return () => window.clearTimeout(t)
  }, [score, reduceMotion])

  const data = [{ name: 'priority', value: animated, fill: '#5B1A1A' }]

  return (
    <div className="relative w-36 h-36 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background={{ fill: '#EFE9DA' }}
            dataKey="value"
            cornerRadius={4}
            max={100}
            animationDuration={reduceMotion ? 0 : 700}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.3 }}
      >
        <span className="display-tight text-3xl font-semibold text-oxblood tabular-nums">
          {animated}
        </span>
        <span className="mono-tag text-[0.6rem]">/ 100</span>
      </motion.div>
    </div>
  )
}
