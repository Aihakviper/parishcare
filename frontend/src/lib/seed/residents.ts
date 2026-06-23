import type { Resident } from '../types/camp'
import { HERO_ARTISAN_ID } from '../types/camp'
import { heroBisi } from './bisi'
import { heroResident } from './hero'

const NAMES = [
  'Adewale Ogunleye',
  'Mercy Eze',
  'Joseph Akpan',
  'Fatima Bello',
  'Chioma Nwosu',
  'Samuel Adeyemi',
  'Grace Okonkwo',
  'Ibrahim Musa',
  'Blessing Okafor',
  'Emmanuel Bassey',
  'Patience Umeh',
  'Kunle Ojo',
  'Maryam Hassan',
  'Victor Eze',
  'Folake Adewale',
  'Peter Udoh',
  'Halima Garba',
  'Segun Oladipo',
  'Adesuwa Ighodaro',
  'Toyin Ogunleye',
  'Usman Ibrahim',
  'Lola Ajayi',
  'Ifeanyi Nnamdi',
]

const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']
const STREETS = ['Faith Avenue', 'Grace Close', 'Mercy Lane', 'Hope Street', 'Peace Road']

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export const seedResidents: Resident[] = [
  heroResident,
  heroBisi,
  ...NAMES.map((name, i) => ({
    id: `resident-${slug(name)}`,
    name,
    phone: `+23481${String(40000000 + i * 6127).slice(0, 8)}`,
    email: `${slug(name)}@camp.rccg`,
    address: `RCCG Camp ${PHASES[i % PHASES.length]} · ${STREETS[i % STREETS.length]} · House ${10 + i}`,
    phase: PHASES[i % PHASES.length],
    languages: ['english', 'pidgin'],
    trustedArtisanIds: i % 5 === 0 ? [HERO_ARTISAN_ID] : [],
    pastJobIds: [],
  })),
]
