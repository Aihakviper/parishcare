import type { Artisan, Trade, TrustTier } from '../types/camp'
import { heroArtisan } from './hero'

const NAMES = [
  'Ibrahim Sani Yusuf',
  'Chiamaka Nwosu',
  'Aisha Mohammed',
  'Olumide Adebayo',
  'Emeka Okonkwo',
  'Bilkisu Garba',
  'Adeyemi Ogunleye',
  'Ngozi Eze',
  'Yusuf Bello',
  'Tope Olafemi',
  'Hauwa Adamu',
  'Kemi Balogun',
  'Samuel Ekanem',
  'Grace Okoro',
  'Musa Abdullahi',
  'Folake Adewale',
  'Peter Udoh',
  'Zainab Lawal',
  'Chidi Obi',
  'Ruth Akinyemi',
  'Abubakar Danjuma',
  'Blessing Okafor',
  'Dayo Fashola',
  'Halima Garba',
  'Victor Eze',
  'Amina Sule',
  'Kunle Ojo',
  'Patience Umeh',
  'Garba Musa',
  'Lola Ajayi',
  'Ifeanyi Nnamdi',
  'Maryam Hassan',
  'Segun Oladipo',
  'Adesuwa Ighodaro',
  'Biodun Akintola',
  'Fatou Diallo',
  'Emmanuel Bassey',
  'Toyin Ogunleye',
  'Usman Ibrahim',
]

const TRADES: Trade[] = [
  'generator_tech',
  'plumber',
  'electrician',
  'tailor',
  'mechanic',
  'carpenter',
  'painter',
  'cleaner',
  'AC_tech',
  'welder',
]

const AREAS = [
  'RCCG Camp Phase 1',
  'RCCG Camp Phase 2',
  'RCCG Camp Phase 3',
  'RCCG Camp Phase 4',
  'Mowe-Camp Border',
]

const PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
]

function tierForIndex(i: number): TrustTier {
  if (i % 7 === 0) return 'steward'
  if (i % 3 === 0) return 'trusted'
  return 'verified'
}

function scoreForTier(tier: TrustTier, i: number): number {
  if (tier === 'steward') return 82 + (i % 12)
  if (tier === 'trusted') return 58 + (i % 20)
  return 32 + (i % 22)
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export const seedArtisans: Artisan[] = [
  heroArtisan,
  ...NAMES.map((name, i) => {
    const tier = tierForIndex(i)
    const trade = TRADES[i % TRADES.length]
    const jobs =
      tier === 'steward' ? 55 + (i % 80) : tier === 'trusted' ? 14 + (i % 40) : 3 + (i % 12)
    return {
      id: `artisan-${slug(name)}`,
      name,
      phone: `+23480${String(30000000 + i * 7919).slice(0, 8)}`,
      trade,
      serviceArea: AREAS[i % AREAS.length],
      tier,
      trustScore: scoreForTier(tier, i),
      completedJobs: jobs,
      averageRating: 3.8 + (i % 12) * 0.1,
      yearsExperience: 2 + (i % 18),
      languages: ['english', i % 2 === 0 ? 'pidgin' : 'yoruba'],
      workPhotos: PHOTOS.slice(0, 3),
      vouchers: [],
      ninVerified: i % 4 !== 0,
      distanceKm: 0.4 + (i % 15) * 0.2,
      availableNow: i % 3 !== 0,
      responseMinutes: 8 + (i % 25),
      photoUrl: PHOTOS[i % PHOTOS.length],
    } satisfies Artisan
  }),
]
