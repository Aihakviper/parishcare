import { motion, useReducedMotion } from 'framer-motion'
import type { ScoreBreakdown } from '../../../lib/types/domain'

const FACTORS: {
  key: keyof ScoreBreakdown
  label: string
  max: number
}[] = [
  { key: 'need_severity', label: 'Need severity', max: 40 },
  { key: 'urgency', label: 'Urgency', max: 25 },
  { key: 'dependents', label: 'Dependents', max: 15 },
  { key: 'verification_strength', label: 'Verification', max: 10 },
  { key: 'recency_penalty', label: 'Recency penalty', max: 20 },
]

interface FactorBreakdownProps {
  breakdown: ScoreBreakdown
  recencyNote?: string
}

export function FactorBreakdown({ breakdown, recencyNote }: FactorBreakdownProps) {
  const reduceMotion = useReducedMotion()

  return (
    <ul className="space-y-3">
      {FACTORS.map((f, i) => {
        const raw = breakdown[f.key]
        const isPenalty = f.key === 'recency_penalty'
        const fillRatio = isPenalty
          ? Math.min(1, Math.abs(raw) / f.max)
          : Math.min(1, raw / f.max)
        const filled = Math.round(fillRatio * 10)

        return (
          <li key={f.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-ink font-medium">{f.label}</span>
              <span className="font-mono text-slate tabular-nums">
                {isPenalty && raw < 0 ? raw : `${raw}/${f.max}`}
              </span>
            </div>
            <div className="font-mono text-sm tracking-widest text-oxblood">
              <motion.span
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 }}
              >
                {'█'.repeat(filled)}
              </motion.span>
              <span className="text-hairline">{'░'.repeat(10 - filled)}</span>
            </div>
            {isPenalty && recencyNote && raw !== 0 && (
              <p className="text-xs text-slate mt-0.5">{recencyNote}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
