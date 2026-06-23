import type { Parish } from '../types/camp'

export const seedParishes: Parish[] = [
  {
    id: 'parish-camp-mowe',
    name: 'RCCG Camp Mowe',
    province: 'Lagos Province 1',
    pastorName: 'Pastor Adekunle Olatunde',
    welfareOfficerName: 'Deacon Grace Okafor',
    phaseCoverage: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'],
  },
  {
    id: 'parish-camp-phase2',
    name: 'RCCG Camp Phase 2 Parish',
    province: 'Lagos Province 1',
    pastorName: 'Pastor Adekunle Olatunde',
    welfareOfficerName: 'Sister Funke Balogun',
    phaseCoverage: ['Phase 2'],
  },
  {
    id: 'parish-mowe-border',
    name: 'RCCG Mowe Border Fellowship',
    province: 'Ogun Province',
    pastorName: 'Pastor Emeka Nwosu',
    welfareOfficerName: 'Brother Tayo Adewale',
    phaseCoverage: ['Mowe-Camp Border'],
  },
]
