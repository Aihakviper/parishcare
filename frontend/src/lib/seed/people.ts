import type {
  Beneficiary,
  DisbursementHistoryEntry,
  NeedCategory,
  StoryTag,
} from '../types/domain'
import { getParishById, parishes, PARISH_IKORODU, PARISH_YABA } from './parishes'
import { createPrng, intBetween, pick } from './prng'

const NEED_CATEGORIES: NeedCategory[] = [
  'school_fees',
  'medical',
  'food',
  'rent',
  'burial',
  'transport',
  'business',
]

const STORY_TAGS: StoryTag[] = [
  'widowed',
  'displaced',
  'disabled',
  'terminally_ill',
  'orphan_guardian',
  'elderly',
  'unemployed',
]

/** Valid Nigerian mobile prefixes (without leading 0). */
const PHONE_PREFIXES = [
  '803', '806', '703', '706', '813', '816', '903', '906',
  '805', '807', '705', '815', '905',
  '802', '808', '708', '812', '901', '902', '904', '907',
  '809', '817', '818', '908', '909',
] as const

const FIRST_NAMES = [
  'Ngozi', 'Chioma', 'Emeka', 'Mercy', 'Joseph', 'Fatima', 'Tunde', 'Aisha',
  'Ibrahim', 'Grace', 'Chidi', 'Hauwa', 'Yemi', 'Amaka', 'Sani', 'Bola',
  'Uche', 'Zainab', 'Funke', 'Obiora', 'Halima', 'Segun', 'Adaeze', 'Musa',
  'Kemi', 'Yusuf', 'Efe', 'Nneka', 'Collins', 'Amina', 'Femi', 'Blessing',
  'Ifeanyi', 'Ramatu', 'Wale', 'Ekanem', 'Danjuma', 'Olumide', 'Sade', 'Akpan',
  'Hassan', 'Nwakaego', 'Biodun', 'Mariam', 'Ikenna', 'Rukayat', 'Tope', 'Etim',
  'Sunday', 'Onyinye', 'Kabir', 'Ngozi', 'Victor', 'Hadiza', 'Lanre', 'Ebere',
]

const LAST_NAMES = [
  'Okafor', 'Nwosu', 'Adebayo', 'Bello', 'Akpan', 'Eze', 'Mohammed', 'Sani',
  'Yusuf', 'Nwachukwu', 'Ogunleye', 'Ibrahim', 'Okonkwo', 'Abdullahi', 'Chukwu',
  'Olatunji', 'Etim', 'Garba', 'Obi', 'Ajayi', 'Ojo', 'Nnamani', 'Omoruyi',
  'Adesanya', 'Udom', 'Essien', 'Balogun', 'Ogundimu', 'Igbinedion', 'Hart',
  'Akintola', 'Daniels', 'Attah', 'Fashola', 'Okeke', 'Musa', 'Okoro', 'Ibe',
]

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function makePhone(rng: () => number, used: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const prefix = pick(rng, PHONE_PREFIXES)
    const suffix = String(intBetween(rng, 1000000, 9999999))
    const phone = `+234${prefix}${suffix}`
    if (!used.has(phone)) {
      used.add(phone)
      return phone
    }
  }
  return `+234803${String(intBetween(rng, 1000000, 9999999))}`
}

function daysAgoToIso(daysAgo: number, hour = 10, minute = 30): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function buildHistory(
  rng: () => number,
  beneficiaryId: string,
  homeParishId: string,
  count: number,
): DisbursementHistoryEntry[] {
  const entries: DisbursementHistoryEntry[] = []
  const otherParishes = parishes.filter((p) => p.id !== homeParishId)

  for (let i = 0; i < count; i++) {
    const useOther = rng() < 0.22 && otherParishes.length > 0
    const parish = useOther ? pick(rng, otherParishes) : getParishById(homeParishId)!
    const daysAgo = intBetween(rng, 3, 89)
    const amountKobo = intBetween(rng, 5_000_00, 150_000_00) // ₦5k–₦150k

    entries.push({
      id: `hist-${beneficiaryId}-${i}`,
      parishId: parish.id,
      parishName: parish.name,
      amountKobo,
      needCategory: pick(rng, NEED_CATEGORIES),
      daysAgo,
      recordedAt: daysAgoToIso(daysAgo, 9 + (i % 6), 15 + (i * 7) % 45),
    })
  }

  return entries.sort((a, b) => a.daysAgo - b.daysAgo)
}

function buildNgozi(): Beneficiary {
  const yaba = getParishById(PARISH_YABA)!

  return {
    id: 'ben-ngozi-okafor',
    name: 'Ngozi Okafor',
    phone: '+2348034564412',
    dependents: 3,
    needCategory: 'transport',
    storyTag: 'widowed',
    homeParishId: PARISH_IKORODU,
    disbursementHistory: [
      {
        id: 'hist-ngozi-yaba-001',
        parishId: PARISH_YABA,
        parishName: yaba.name,
        amountKobo: 2_500_000,
        needCategory: 'school_fees',
        daysAgo: 11,
        recordedAt: daysAgoToIso(11),
        voiceNote: {
          durationSeconds: 42,
          pastorName: 'Pastor M.O.',
          transcript:
            'Sister Ngozi lost her husband to a road accident in March. Three children, eldest in SS2. Genuine. Praying.',
        },
      },
    ],
  }
}

function generateOthers(count: number): Beneficiary[] {
  const rng = createPrng(42)
  const usedPhones = new Set<string>(['+2348034564412'])
  const people: Beneficiary[] = []

  for (let i = 0; i < count; i++) {
    const first = pick(rng, FIRST_NAMES)
    const last = pick(rng, LAST_NAMES)
    const name = `${first} ${last}`
    const id = `ben-${slugify(name)}-${i}`
    const parish = pick(rng, parishes)
    const historyCount = intBetween(rng, 0, 3)

    people.push({
      id,
      name,
      phone: makePhone(rng, usedPhones),
      dependents: intBetween(rng, 1, 7),
      needCategory: pick(rng, NEED_CATEGORIES),
      storyTag: pick(rng, STORY_TAGS),
      homeParishId: parish.id,
      disbursementHistory: buildHistory(rng, id, parish.id, historyCount),
    })
  }

  return people
}

/** 60 beneficiaries — Ngozi Okafor is index 0 (hero). */
export const people: Beneficiary[] = [buildNgozi(), ...generateOthers(59)]

export function getBeneficiaryById(id: string): Beneficiary | undefined {
  return people.find((p) => p.id === id)
}

export function getBeneficiaryByPhone(phone: string): Beneficiary | undefined {
  const normalized = phone.replace(/\D/g, '')
  return people.find((p) => p.phone.replace(/\D/g, '') === normalized)
}

export const HERO_BENEFICIARY_ID = 'ben-ngozi-okafor'
