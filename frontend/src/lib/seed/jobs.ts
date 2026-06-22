import type { Job, JobStatus, Trade } from '../types/camp'
import { HERO_ARTISAN_ID, HERO_RESIDENT_ID } from '../types/camp'
import { heroJob } from './hero'
import { seedArtisans } from './artisans'
import { seedResidents } from './residents'

const STATUSES: JobStatus[] = [
  'completed',
  'completed',
  'closed',
  'working',
  'accepted',
  'requested',
]

const DESCRIPTIONS: Record<Trade, string[]> = {
  generator_tech: ['Generator no dey start', 'Fuel pump need replacement'],
  plumber: ['Pipe leak under kitchen sink', 'Toilet no dey flush well'],
  electrician: ['Socket spark when plug in', 'Light no dey come for bedroom'],
  tailor: ['Sew choir uniform before Sunday', 'Adjust agbada for convention'],
  mechanic: ['Car no dey start for morning', 'Brake pad need change'],
  carpenter: ['Door hinge don spoil', 'Build small shelf for pantry'],
  painter: ['Paint living room before guest arrive', 'Touch up exterior wall'],
  cleaner: ['Deep clean before family visit', 'Post-renovation cleanup'],
  security: ['Night watch for 3 days', 'Event gate control'],
  hair_braider: ['Braids for convention', 'Quick retouch before service'],
  welder: ['Gate hinge welding', 'Repair metal frame'],
  mason: ['Block work for extension', 'Repair cracked wall'],
  AC_tech: ['AC no dey cool', 'Gas refill and service'],
  vulcanizer: ['Tyre puncture repair', 'Wheel alignment check'],
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
}

function priceForTrade(trade: Trade): number {
  const base: Record<Trade, number> = {
    generator_tech: 1_800_000,
    plumber: 1_200_000,
    electrician: 1_500_000,
    tailor: 800_000,
    mechanic: 2_000_000,
    carpenter: 1_000_000,
    painter: 900_000,
    cleaner: 1_200_000,
    security: 1_500_000,
    hair_braider: 600_000,
    welder: 1_100_000,
    mason: 1_400_000,
    AC_tech: 1_600_000,
    vulcanizer: 500_000,
  }
  return base[trade]
}

const generated: Job[] = Array.from({ length: 40 }, (_, i) => {
  const artisan = seedArtisans[(i % (seedArtisans.length - 1)) + 1]
  const resident = seedResidents[(i % (seedResidents.length - 1)) + 1]
  const status = STATUSES[i % STATUSES.length]
  const escrowStatus =
    status === 'completed' || status === 'closed'
      ? 'released'
      : status === 'requested'
        ? 'pending'
        : 'held'

  return {
    id: `job-${String(i + 1).padStart(4, '0')}`,
    residentId: resident.id,
    artisanId: artisan.id,
    trade: artisan.trade,
    description: DESCRIPTIONS[artisan.trade][i % 2],
    status,
    priceKobo: priceForTrade(artisan.trade) + (i % 5) * 50_000,
    escrowStatus,
    escrowRef: escrowStatus !== 'pending' ? `STW-ESC-2026-${String(1000 + i)}` : undefined,
    releaseRef: escrowStatus === 'released' ? `STW-RLS-2026-${String(1000 + i)}` : undefined,
    createdAt: daysAgo(28 - (i % 28)),
    updatedAt: daysAgo(27 - (i % 27)),
    timeline: [
      {
        id: `jt-${i}-1`,
        at: daysAgo(28 - (i % 28)),
        label: 'Job requested',
        kind: 'status',
      },
    ],
    photos: {},
    rating: status === 'completed' ? 4 + (i % 2) : undefined,
  } satisfies Job
})

/** Past completed jobs for Funmi */
const funmiPast: Job[] = [
  {
    id: 'job-funmi-past-1',
    residentId: HERO_RESIDENT_ID,
    artisanId: HERO_ARTISAN_ID,
    trade: 'plumber',
    description: 'Kitchen tap replacement',
    status: 'completed',
    priceKobo: 950_000,
    escrowStatus: 'released',
    escrowRef: 'STW-ESC-2025-009812',
    releaseRef: 'STW-RLS-2025-009812',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(44),
    timeline: [],
    photos: {},
    rating: 5,
  },
  {
    id: 'job-funmi-past-2',
    residentId: HERO_RESIDENT_ID,
    artisanId: HERO_ARTISAN_ID,
    trade: 'electrician',
    description: 'Fix bedroom socket',
    status: 'completed',
    priceKobo: 1_200_000,
    escrowStatus: 'released',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(89),
    timeline: [],
    photos: {},
    rating: 5,
  },
]

export const seedJobs: Job[] = [heroJob, ...funmiPast, ...generated]
