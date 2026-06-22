import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

interface PriorityGaugeProps {
  score: number
}

export function PriorityGauge({ score }: PriorityGaugeProps) {
  const reduceMotion = useReducedMotion()
  const isFirstRender = useRef(true)
  const [displayScore, setDisplayScore] = useState(() => (reduceMotion ? score : 0))
  const [animDone, setAnimDone] = useState(() => Boolean(reduceMotion))

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (!reduceMotion) {
        const show = window.setTimeout(() => setDisplayScore(score), 60)
        const done = window.setTimeout(() => setAnimDone(true), 780)
        return () => {
          window.clearTimeout(show)
          window.clearTimeout(done)
        }
      }
      return
    }
    setDisplayScore(score)
  }, [score, reduceMotion])

  const data = [{ name: 'priority', value: displayScore, fill: '#2A6B5A' }]

  return (
    <div className="relative w-36 h-36 mx-auto" role="img" aria-label={`Priority score ${score} out of 100`}>
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
        <span className="display-tight text-3xl font-semibold text-verdigris tabular-nums">
          {displayScore}
        </span>
        <span className="mono-tag text-[0.6rem]">/ 100</span>
      </div>
    </div>
  )
}
