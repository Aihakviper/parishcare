import type { Artisan, PillarBreakdown, TrustTier } from './types/camp'

export interface TrustBreakdown {
  identity: number
  skill: number
  volume: number
  quality: number
  tenure: number
  penalties: number
  total: number
}

export function computeTrustScore(artisan: Artisan): TrustBreakdown {
  const identity = artisan.ninVerified ? 20 : 0
  const vouchCount = artisan.vouchers.length
  const sampleScore = artisan.workPhotos.length >= 3 ? 1 : 0.6
  const skill = Math.min(20, (artisan.yearsExperience / 15) * 10 + vouchCount * 4 + sampleScore * 4)
  const volume = Math.min(25, Math.log(artisan.completedJobs + 1) * 8.5)
  const quality = Math.min(25, (artisan.averageRating - 3) * 12.5)
  const tenure = Math.min(10, artisan.yearsExperience * 0.8)
  const penalties = 0
  const total = Math.round(identity + skill + volume + quality + tenure - penalties)

  return {
    identity,
    skill: Math.round(skill),
    volume: Math.round(volume),
    quality: Math.round(quality),
    tenure: Math.round(tenure),
    penalties,
    total,
  }
}

export function tierFromScore(score: number): TrustTier {
  if (score < 30) return 'unverified'
  if (score < 56) return 'verified'
  if (score < 81) return 'trusted'
  return 'steward'
}

export function nextTierRequirement(artisan: Artisan) {
  const score = computeTrustScore(artisan).total
  const current = tierFromScore(score)

  if (current === 'steward') {
    return {
      nextTier: 'steward' as const,
      jobsNeeded: 0,
      ratingToMaintain: 4.8,
      timeNeeded: 'Standing before kings.',
    }
  }

  if (current === 'trusted') {
    const jobsNeeded = Math.max(0, 50 - artisan.completedJobs)
    return {
      nextTier: 'steward' as const,
      jobsNeeded,
      ratingToMaintain: 4.5,
      timeNeeded: '3 months more on platform · 1 Steward endorsement',
    }
  }

  if (current === 'verified') {
    return {
      nextTier: 'trusted' as const,
      jobsNeeded: Math.max(0, 10 - artisan.completedJobs),
      ratingToMaintain: 4.5,
      timeNeeded: '90 days on platform',
    }
  }

  return {
    nextTier: 'verified' as const,
    jobsNeeded: 3,
    ratingToMaintain: 4.0,
    timeNeeded: 'Complete NIN verification',
  }
}

/** Five Trust Pillars (0–20 each) */
export function getPillarBreakdown(artisan: Artisan): PillarBreakdown {
  const vouchCount = artisan.vouchers.length
  return {
    identity: artisan.ninVerified ? 20 : 4,
    vouch: Math.min(20, vouchCount * 8 + 4),
    proof: Math.min(20, Math.round(Math.log(artisan.completedJobs + 1) * 5)),
    generosity: artisan.completedJobs >= 20 ? 16 : 8,
    standing: vouchCount >= 2 ? 18 : 10,
  }
}
