export type TrustTier = 'unverified' | 'verified' | 'trusted' | 'steward'
export type Trade =
  | 'generator_tech'
  | 'plumber'
  | 'electrician'
  | 'tailor'
  | 'mechanic'
  | 'carpenter'
  | 'painter'
  | 'cleaner'
  | 'security'
  | 'hair_braider'
  | 'welder'
  | 'mason'
  | 'AC_tech'
  | 'vulcanizer'

export type JobStatus =
  | 'requested'
  | 'quoted'
  | 'accepted'
  | 'en_route'
  | 'working'
  | 'completed'
  | 'disputed'
  | 'closed'

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded'

export type DisputeStatus = 'open' | 'mediating' | 'resolved'

export interface VoiceClip {
  url: string
  durationSeconds: number
  transcript: string
}

export interface CommunityVoucher {
  id: string
  fromName: string
  fromRole: string
  date: string
}

export interface Artisan {
  id: string
  name: string
  phone: string
  trade: Trade
  serviceArea: string
  tier: TrustTier
  trustScore: number
  completedJobs: number
  averageRating: number
  yearsExperience: number
  languages: string[]
  voiceIntro?: VoiceClip
  workPhotos: string[]
  vouchers: CommunityVoucher[]
  ninVerified: boolean
  distanceKm?: number
  availableNow?: boolean
  responseMinutes?: number
  photoUrl?: string
}

export interface Resident {
  id: string
  name: string
  phone: string
  email: string
  address: string
  phase: string
  languages: string[]
  trustedArtisanIds: string[]
  pastJobIds: string[]
}

export interface JobTimelineEvent {
  id: string
  at: string
  label: string
  voiceNote?: VoiceClip
  photoUrl?: string
  kind: 'status' | 'voice' | 'photo' | 'payment'
}

export interface Job {
  id: string
  residentId: string
  artisanId: string
  trade: Trade
  description: string
  voiceDescription?: VoiceClip
  status: JobStatus
  priceKobo: number
  escrowStatus: EscrowStatus
  escrowRef?: string
  releaseRef?: string
  createdAt: string
  updatedAt: string
  timeline: JobTimelineEvent[]
  photos: { before?: string; during?: string; after?: string }
  rating?: number
  reviewText?: string
  isHero?: boolean
}

export interface Dispute {
  id: string
  jobId: string
  residentId: string
  artisanId: string
  status: DisputeStatus
  reason: string
  openedAt: string
  openedBy: 'resident' | 'artisan'
  residentStatement: string
  artisanStatement: string
  residentVoice?: VoiceClip
  artisanVoice?: VoiceClip
  escrowKobo: number
}

export interface CampPattern {
  id: string
  title: string
  explanation: string
  suggestedAction: string
  status: 'new' | 'acknowledged' | 'acting' | 'dismissed'
  trade?: Trade
  area?: string
}

export interface CampStats {
  jobsCompletedWeek: number
  activeArtisans: number
  avgResponseMinutes: number
  disputesPending: number
  totalDisbursedKobo: number
}

export const TRADE_LABELS: Record<Trade, string> = {
  generator_tech: 'Generator',
  plumber: 'Plumber',
  electrician: 'Electrician',
  tailor: 'Tailor',
  mechanic: 'Mechanic',
  carpenter: 'Carpenter',
  painter: 'Painter',
  cleaner: 'Cleaner',
  security: 'Security',
  hair_braider: 'Hair',
  welder: 'Welder',
  mason: 'Mason',
  AC_tech: 'AC',
  vulcanizer: 'Vulcanizer',
}

export const HERO_RESIDENT_ID = 'resident-funmi'
export const HERO_ARTISAN_ID = 'artisan-tunde-akinwale'
export const HERO_JOB_ID = 'job-hero-generator'
