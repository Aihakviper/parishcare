import type { StewardsFund } from '../types/camp'
import { HERO_JOB_ID } from '../types/camp'

export const seedStewardsFund: StewardsFund = {
  balanceKobo: 2_450_000,
  monthlyInflowKobo: 1_850_000,
  monthlyOutflowKobo: 500_000,
  entries: [
    {
      id: 'fnd-001',
      type: 'contribution',
      amountKobo: 92_500,
      sourceJobId: HERO_JOB_ID,
      note: 'Funmi Adebanjo · generator job',
      at: new Date().toISOString(),
    },
    {
      id: 'fnd-002',
      type: 'disbursement',
      amountKobo: 500_000,
      note: 'Tool stipend · Emeka Okonkwo',
      at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
  ],
}
