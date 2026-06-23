import type { Artisan, Job, Resident } from '../types/camp'
import {
  HERO_ARTISAN_ID,
  HERO_JOB_ID,
  HERO_RESIDENT_ID,
} from '../types/camp'

export const heroResident: Resident = {
  id: HERO_RESIDENT_ID,
  name: 'Funmi Adebanjo',
  phone: '+2348034429817',
  email: 'funmi.adebanjo@camp.rccg',
  address: 'RCCG Camp Phase 2 · Faith Avenue · House 14',
  phase: 'Phase 2',
  languages: ['english', 'yoruba', 'pidgin'],
  trustedArtisanIds: [HERO_ARTISAN_ID],
  pastJobIds: [],
}

export const heroArtisan: Artisan = {
  id: HERO_ARTISAN_ID,
  name: 'Tunde Akinwale',
  phone: '+2348062194471',
  trade: 'generator_tech',
  serviceArea: 'Mowe-Camp Border',
  tier: 'trusted',
  trustScore: 73,
  completedJobs: 31,
  averageRating: 4.8,
  yearsExperience: 12,
  languages: ['english', 'pidgin', 'yoruba'],
  voiceIntro: {
    url: 'mock://voice/tunde-intro',
    durationSeconds: 18,
    transcript:
      'Good day my name is Tunde, I dey fix generators for 12 years now. From small i-pass-my-neighbor to big 25 KVA. If you call me, I dey come on time, I dey work clean, and if the problem fit reach me, I go fix am. Thank you.',
  },
  workPhotos: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop',
  ],
  vouchers: [
    {
      id: 'v-mama-iyabo',
      fromName: 'Mama Iyabo Adewale',
      fromRole: 'Deaconess · Phase 2',
      date: '2026-01-20',
    },
    {
      id: 'v1',
      fromName: 'Pastor Adekunle Olatunde',
      fromRole: 'Parish Administrator',
      date: '2025-11-12',
    },
  ],
  ninVerified: true,
  distanceKm: 0.8,
  availableNow: true,
  responseMinutes: 12,
  photoUrl:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
}

const now = new Date()
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()

export const heroJob: Job = {
  id: HERO_JOB_ID,
  residentId: HERO_RESIDENT_ID,
  artisanId: HERO_ARTISAN_ID,
  trade: 'generator_tech',
  description: 'Generator no dey start. Service Sunday is in 6 hours.',
  voiceDescription: {
    url: 'mock://voice/funmi-request',
    durationSeconds: 8,
    transcript:
      'Bayo, my generator no want start at all. Make somebody come look am this morning if possible.',
  },
  status: 'working',
  priceKobo: 1_850_000,
  escrowStatus: 'held',
  escrowRef: 'STW-ESC-2026-001847',
  createdAt: hoursAgo(2.5),
  updatedAt: hoursAgo(0.75),
  isHero: true,
  timeline: [
    {
      id: 't1',
      at: hoursAgo(2.5),
      label: 'Job requested by Funmi',
      kind: 'status',
    },
    {
      id: 't2',
      at: hoursAgo(2.47),
      label: 'Tunde accepted — ₦18,500 funded to escrow',
      kind: 'payment',
    },
    {
      id: 't3',
      at: hoursAgo(2.45),
      label: 'Tunde said: "I dey on the way, give me 20 minutes"',
      voiceNote: {
        url: 'mock://voice/tunde-enroute',
        durationSeconds: 4,
        transcript: 'I dey on the way, give me 20 minutes',
      },
      kind: 'voice',
    },
    {
      id: 't4',
      at: hoursAgo(2.1),
      label: 'Tunde arrived — before photo uploaded',
      photoUrl:
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
      kind: 'photo',
    },
    {
      id: 't5',
      at: hoursAgo(0.75),
      label: 'Tunde started work — during photo uploaded',
      photoUrl:
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop',
      kind: 'photo',
    },
  ],
  photos: {
    before:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    during:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop',
  },
}
