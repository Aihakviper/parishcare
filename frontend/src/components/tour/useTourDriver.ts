import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { useTourStore } from '../../store/tour'
import { useSessionStore } from '../../store/session'
import { TOUR_STEPS } from '../../lib/tour/steps'
import { resetDemo } from '../../lib/mock-api'

export function useTourDriver() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const active = useTourStore((s) => s.active)
  const step = useTourStore((s) => s.step)
  const paused = useTourStore((s) => s.paused)
  const showFinal = useTourStore((s) => s.showFinal)
  const setRole = useSessionStore((s) => s.setRole)
  const nextStep = useTourStore((s) => s.nextStep)
  const exitTour = useTourStore((s) => s.exitTour)
  const completeTour = useTourStore((s) => s.completeTour)
  const setPendingAction = useTourStore((s) => s.setPendingAction)
  const setChainPulse = useTourStore((s) => s.setChainPulse)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const started = useRef(false)

  const clearTimers = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (actionTimer.current) clearTimeout(actionTimer.current)
    advanceTimer.current = null
    actionTimer.current = null
  }

  // Esc to exit
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearTimers()
        setRole('officer', 'Tour complete · explore freely')
        navigate('/officer')
        completeTour()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, completeTour, navigate, setRole])

  // Reset demo on first activation
  useEffect(() => {
    if (!active) {
      started.current = false
      return
    }
    if (!started.current) {
      started.current = true
      resetDemo()
      setRole('officer')
      navigate('/officer', { replace: true })
    }
  }, [active, navigate, setRole])

  // Step navigation + actions + auto-advance
  useEffect(() => {
    if (!active || showFinal) return

    clearTimers()
    const def = TOUR_STEPS[step]
    if (!def) return

    setRole(def.role)
    navigate(def.path)

    if (def.action) {
      const delay = def.actionDelayMs ?? 1_500
      actionTimer.current = setTimeout(() => {
        if (def.action === 'pulse-chain') {
          setChainPulse(true)
        } else {
          setPendingAction(def.action!)
        }
      }, delay)
    }

    if (!reduceMotion && !paused) {
      advanceTimer.current = setTimeout(() => {
        nextStep()
      }, def.durationMs)
    }

    return clearTimers
  }, [
    active,
    step,
    paused,
    showFinal,
    reduceMotion,
    navigate,
    setRole,
    nextStep,
    setPendingAction,
    setChainPulse,
  ])

  const finishTour = () => {
    clearTimers()
    setRole('officer', 'Tour complete · explore freely')
    navigate('/officer')
    exitTour()
  }

  const handleExitEarly = () => {
    clearTimers()
    exitTour()
  }

  const restartTour = () => {
    clearTimers()
    resetDemo()
    useTourStore.getState().startTour()
  }

  return { finishTour, handleExitEarly, restartTour, reduceMotion: !!reduceMotion }
}
