import { intBetween } from './prng'

/** Whole-naira amounts only (kobo divisible by 100). */
export function koboFromNaira(
  rng: () => number,
  minNaira: number,
  maxNaira: number,
  stepNaira = 500,
): number {
  const minSteps = Math.floor(minNaira / stepNaira)
  const maxSteps = Math.floor(maxNaira / stepNaira)
  const steps = intBetween(rng, minSteps, maxSteps)
  return steps * stepNaira * 100
}

export function roundKobo(kobo: number): number {
  return Math.round(kobo / 100) * 100
}
