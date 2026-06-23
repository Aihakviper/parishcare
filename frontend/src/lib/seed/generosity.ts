import type { GenerosityAct } from '../types/camp'
import { HERO_ARTISAN_ID, HERO_MEMBER_ID } from '../types/camp'

export const seedGenerosity: GenerosityAct[] = [
  {
    id: 'gen-funmi-fund-001',
    actorId: HERO_MEMBER_ID,
    actorName: 'Funmi Adebanjo',
    actType: 'fund_contribution',
    amountKobo: 92_500,
    beneficiaryLabel: 'Stewards Fund',
    occurredAt: new Date().toISOString(),
  },
  {
    id: 'gen-tunde-mentor-001',
    actorId: HERO_ARTISAN_ID,
    actorName: 'Tunde Akinwale',
    actType: 'mentor_hours',
    beneficiaryLabel: 'Emeka Okonkwo',
    occurredAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
]
