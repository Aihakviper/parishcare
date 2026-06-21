import { useEffect, useState } from 'react'
import type { PastoralVoiceNote } from '../../../lib/types/domain'
import { cn } from '../../../lib/cn'

interface VoiceNotePlayerProps {
  note: PastoralVoiceNote
  className?: string
  autoPlay?: boolean
}

export function VoiceNotePlayer({ note, className, autoPlay }: VoiceNotePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

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
  const playLabel = playing
    ? 'Pause voice note'
    : progress > 0 && progress < 100
      ? 'Resume voice note'
      : 'Play voice note'

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
          aria-label={playLabel}
          className="w-11 h-11 rounded-full bg-oxblood text-bone text-xs font-bold shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
        >
          {playing ? 'Pause' : progress > 0 && progress < 100 ? 'Resume' : 'Play'}
        </button>
        <div className="flex-1">
          <div
            className="h-1.5 bg-hairline rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Playback progress"
          >
            <div className="h-full bg-oxblood transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <p className="font-mono text-xs text-slate mt-1">{durationLabel}</p>
        </div>
      </div>
      {(playing || progress > 0) && (
        <p className="mt-4 text-sm text-ink italic border-l-2 border-gilt pl-3">
          &ldquo;{note.transcript}&rdquo;
        </p>
      )}
    </div>
  )
}
