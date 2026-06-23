import type { Apprenticeship } from '../types/camp'
import { HERO_ARTISAN_ID, HERO_MEMBER_ID } from '../types/camp'

export const seedApprenticeships: Apprenticeship[] = [
  {
    id: 'apprentice-emeka-001',
    masterArtisanId: HERO_ARTISAN_ID,
    apprenticeName: 'Emeka Okonkwo',
    apprenticePhone: '+2348134456721',
    trade: 'generator_tech',
    status: 'active',
    parishId: 'parish-camp-phase2',
    startedAt: '2025-10-15',
    monthsIn: 4,
    stipendKoboRequested: 500_000,
    supportedByMemberIds: [HERO_MEMBER_ID],
  },
  {
    id: 'apprentice-chioma-002',
    masterArtisanId: 'artisan-olumide-adebayo',
    apprenticeName: 'Chioma Eze',
    apprenticePhone: '+2348032219844',
    trade: 'plumber',
    status: 'active',
    parishId: 'parish-camp-mowe',
    startedAt: '2025-12-01',
    monthsIn: 2,
    supportedByMemberIds: [],
  },
]
