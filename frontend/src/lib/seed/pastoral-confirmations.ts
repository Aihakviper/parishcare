import type { PastoralConfirmation } from '../types/camp'
import { HERO_ARTISAN_ID, HERO_PASTOR_ID } from '../types/camp'

export const seedPastoralConfirmations: PastoralConfirmation[] = [
  {
    id: 'confirm-tunde-001',
    subjectType: 'artisan',
    subjectId: HERO_ARTISAN_ID,
    subjectName: 'Tunde Akinwale',
    confirmingPastorId: HERO_PASTOR_ID,
    parishId: 'parish-camp-mowe',
    status: 'confirmed',
    note: 'Annual standing confirmed. Reliable at Camp homes.',
    confirmedAt: '2025-11-12',
  },
  {
    id: 'confirm-emeka-pending',
    subjectType: 'artisan',
    subjectId: HERO_ARTISAN_ID,
    subjectName: 'Emeka Okonkwo (apprentice stipend)',
    confirmingPastorId: HERO_PASTOR_ID,
    parishId: 'parish-camp-phase2',
    status: 'pending',
    note: 'Stipend request from Stewards Fund',
  },
  {
    id: 'confirm-new-mentor-001',
    subjectType: 'artisan',
    subjectId: 'artisan-ibrahim-sani-yusuf',
    subjectName: 'Ibrahim Sani Yusuf',
    confirmingPastorId: HERO_PASTOR_ID,
    parishId: 'parish-camp-mowe',
    status: 'pending',
  },
]
