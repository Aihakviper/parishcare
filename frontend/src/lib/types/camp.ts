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

export type TrustPillar = 'identity' | 'vouch' | 'proof' | 'generosity' | 'standing'

export interface PillarBreakdown {
  identity: number
  vouch: number
  proof: number
  generosity: number
  standing: number
}

export interface Parish {
  id: string
  name: string
  province: string
  pastorName: string
  welfareOfficerName: string
  phaseCoverage: string[]
}

export type ApprenticeshipStatus = 'requested' | 'active' | 'completed' | 'released'

export interface Apprenticeship {
  id: string
  masterArtisanId: string
  apprenticeName: string
  apprenticePhone: string
  trade: Trade
  status: ApprenticeshipStatus
  parishId: string
  startedAt: string
  monthsIn: number
  stipendKoboRequested?: number
  supportedByMemberIds: string[]
}

export type ConfirmationStatus = 'pending' | 'confirmed' | 'declined'

export interface PastoralConfirmation {
  id: string
  subjectType: 'artisan' | 'member'
  subjectId: string
  subjectName: string
  confirmingPastorId: string
  parishId: string
  status: ConfirmationStatus
  note?: string
  confirmedAt?: string
}

export type GenerosityActType =
  | 'mentor_hours'
  | 'fund_contribution'
  | 'tool_donation'
  | 'apprentice_stipend'

export interface GenerosityAct {
  id: string
  actorId: string
  actorName: string
  actType: GenerosityActType
  amountKobo?: number
  beneficiaryLabel: string
  occurredAt: string
}

export interface StewardsFundEntry {
  id: string
  type: 'contribution' | 'disbursement'
  amountKobo: number
  sourceJobId?: string
  note: string
  at: string
}

export interface StewardsFund {
  balanceKobo: number
  monthlyInflowKobo: number
  monthlyOutflowKobo: number
  entries: StewardsFundEntry[]
}

export interface VoucherRequest {
  id: string
  artisanId: string
  voucherName: string
  voucherPhone: string
  status: 'pending' | 'confirmed'
  message: string
  response?: string
}

export interface LineageNode {
  id: string
  name: string
  tier: TrustTier
  role: 'master' | 'self' | 'apprentice'
}

export interface PaymentSplit {
  artisanKobo: number
  opsKobo: number
  fundKobo: number
  totalKobo: number
}

export function computePaymentSplit(totalKobo: number): PaymentSplit {
  const fundKobo = Math.round(totalKobo * 0.05)
  const opsKobo = Math.round(totalKobo * 0.05)
  const artisanKobo = totalKobo - fundKobo - opsKobo
  return { artisanKobo, opsKobo, fundKobo, totalKobo }
}

export const HERO_BISI_ID = 'member-bisi'
export const HERO_MEMBER_ID = 'member-funmi'
/** @deprecated use HERO_MEMBER_ID */
export const HERO_RESIDENT_ID = HERO_MEMBER_ID
export const HERO_ARTISAN_ID = 'artisan-tunde-akinwale'
export const HERO_JOB_ID = 'job-hero-generator'
export const HERO_VOUCHER_ID = 'voucher-mama-iyabo'
export const HERO_PASTOR_ID = 'admin-adekunle'
export const HERO_APPRENTICE_NAME = 'Emeka Okonkwo'
