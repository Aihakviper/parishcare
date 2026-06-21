import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { PastoralVoiceNote } from '../../../lib/types/domain'
import { cn } from '../../../lib/cn'

interface VoiceNotePlayerProps {
  note: PastoralVoiceNote
  className?: string
  autoPlay?: boolean
}

const BAR_COUNT = 12

export function VoiceNotePlayer({ note, className, autoPlay }: VoiceNotePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (autoPlay) {
      setProgress(0)
      setPlaying(true)
    }
  }, [autoPlay])

  useEffect(() => {
    if (!playing) return
    const interval = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false)
          return 100
        }
        return p + 100 / (note.durationSeconds * 10)
      })
    }, 100)
    return () => window.clearInterval(interval)
  }, [playing, note.durationSeconds])

  const toggle = () => {
    if (playing) {
      setPlaying(false)
    } else {
      if (progress >= 100) setProgress(0)
      setPlaying(true)
    }
  }

  const mins = Math.floor(note.durationSeconds / 60)
  const secs = note.durationSeconds % 60
  const durationLabel = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div
      className={cn(
        'bg-parchment-soft border border-hairline rounded-frame p-4',
        className,
      )}
    >
      <p className="mono-tag">Voice note · {note.pastorName}</p>
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={toggle}
          className="w-11 h-11 rounded-full bg-oxblood text-bone text-xs font-bold shrink-0"
        >
          {playing ? 'Pause' : progress > 0 && progress < 100 ? 'Resume' : 'Play'}
        </button>
        <div className="flex-1">
          {playing && !reduceMotion ? (
            <div className="flex items-end gap-0.5 h-6" aria-hidden>
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <motion.span
                  key={i}
                  className="w-1 bg-oxblood/80 rounded-full"
                  animate={{ height: ['30%', '100%', '40%'] }}
                  transition={{
                    duration: 0.55 + (i % 4) * 0.1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.05,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-1.5 bg-hairline rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-oxblood"
                style={{ width: `${progress}%` }}
                layout={!reduceMotion}
              />
            </div>
          )}
          <p className="font-mono text-xs text-slate mt-1">{durationLabel}</p>
        </div>
      </div>
      {(playing || progress > 0) && (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-sm text-ink italic border-l-2 border-gilt pl-3"
        >
          &ldquo;{note.transcript}&rdquo;
        </motion.p>
      )}
    </div>
  )
}
