import type {
  Apprenticeship,
  Artisan,
  CampPattern,
  CampStats,
  Dispute,
  GenerosityAct,
  Job,
  LineageNode,
  Parish,
  PastoralConfirmation,
  Resident,
  StewardsFund,
  Trade,
  VoucherRequest,
} from '../types/camp'
import { computePaymentSplit } from '../types/camp'
import { seedApprenticeships } from '../seed/apprenticeships'
import { seedArtisans } from '../seed/artisans'
import { seedDisputes } from '../seed/disputes'
import { seedGenerosity } from '../seed/generosity'
import { seedJobs } from '../seed/jobs'
import { seedParishes } from '../seed/parishes'
import { seedPastoralConfirmations } from '../seed/pastoral-confirmations'
import { seedResidents } from '../seed/residents'
import { seedStewardsFund } from '../seed/stewards-fund'
import {
  HERO_ARTISAN_ID,
  HERO_JOB_ID,
  HERO_MEMBER_ID,
  HERO_RESIDENT_ID,
} from '../types/camp'

const STORAGE_KEY = 'steward_camp_v2'

interface CampState {
  artisans: Artisan[]
  residents: Resident[]
  jobs: Job[]
  disputes: Dispute[]
  parishes: Parish[]
  apprenticeships: Apprenticeship[]
  pastoralConfirmations: PastoralConfirmation[]
  generosity: GenerosityAct[]
  stewardsFund: StewardsFund
  voucherRequests: VoucherRequest[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function initialState(): CampState {
  return {
    artisans: clone(seedArtisans),
    residents: clone(seedResidents),
    jobs: clone(seedJobs),
    disputes: clone(seedDisputes),
    parishes: clone(seedParishes),
    apprenticeships: clone(seedApprenticeships),
    pastoralConfirmations: clone(seedPastoralConfirmations),
    generosity: clone(seedGenerosity),
    stewardsFund: clone(seedStewardsFund),
    voucherRequests: [],
  }
}

function loadState(): CampState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    return JSON.parse(raw) as CampState
  } catch {
    return initialState()
  }
}

function saveState(state: CampState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function delay<T>(value: T): Promise<T> {
  const ms = 180 + Math.floor(Math.random() * 240)
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

let state = loadState()

export function resetCampDemo(): void {
  localStorage.removeItem(STORAGE_KEY)
  state = initialState()
}

export interface ArtisanFilters {
  trade?: Trade
  tier?: Artisan['tier']
  near?: string
  query?: string
}

export const campApi = {
  async resetDemo(): Promise<void> {
    await delay(undefined)
    resetCampDemo()
  },

  async listArtisans(filters: ArtisanFilters = {}): Promise<Artisan[]> {
    let list = [...state.artisans]
    if (filters.trade) list = list.filter((a) => a.trade === filters.trade)
    if (filters.tier) list = list.filter((a) => a.tier === filters.tier)
    if (filters.near) {
      const q = filters.near.toLowerCase()
      list = list.filter((a) => a.serviceArea.toLowerCase().includes(q))
    }
    if (filters.query) {
      const q = filters.query.toLowerCase()
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.trade.includes(q),
      )
    }
    list.sort((a, b) => {
      const tierOrder = { steward: 0, trusted: 1, verified: 2, unverified: 3 }
      const td = tierOrder[a.tier] - tierOrder[b.tier]
      if (td !== 0) return td
      return (a.distanceKm ?? 99) - (b.distanceKm ?? 99)
    })
    return delay(list)
  },

  async getArtisan(id: string): Promise<Artisan | null> {
    return delay(state.artisans.find((a) => a.id === id) ?? null)
  },

  async getResident(id: string): Promise<Resident | null> {
    return delay(state.residents.find((r) => r.id === id) ?? null)
  },

  async listJobs(filters: {
    residentId?: string
    artisanId?: string
    status?: Job['status']
  } = {}): Promise<Job[]> {
    let list = [...state.jobs]
    if (filters.residentId) {
      const id = filters.residentId
      list = list.filter(
        (j) => j.residentId === id || (id === HERO_MEMBER_ID && j.residentId === HERO_RESIDENT_ID),
      )
    }
    if (filters.artisanId) list = list.filter((j) => j.artisanId === filters.artisanId)
    if (filters.status) list = list.filter((j) => j.status === filters.status)
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return delay(list)
  },

  async getJob(id: string): Promise<Job | null> {
    return delay(state.jobs.find((j) => j.id === id) ?? null)
  },

  async acceptJob(jobId: string): Promise<Job> {
    const job = state.jobs.find((j) => j.id === jobId)
    if (!job) throw new Error('Job not found')
    job.status = 'accepted'
    job.escrowStatus = 'held'
    job.escrowRef = job.escrowRef ?? `STW-ESC-2026-${Date.now().toString().slice(-6)}`
    job.updatedAt = new Date().toISOString()
    job.timeline.push({
      id: `t-${Date.now()}`,
      at: job.updatedAt,
      label: 'Artisan accepted — escrow funded',
      kind: 'payment',
    })
    saveState(state)
    return delay(job)
  },

  async updateJobStatus(
    jobId: string,
    status: Job['status'],
    extra?: { photo?: 'before' | 'during' | 'after'; photoUrl?: string },
  ): Promise<Job> {
    const job = state.jobs.find((j) => j.id === jobId)
    if (!job) throw new Error('Job not found')
    job.status = status
    job.updatedAt = new Date().toISOString()
    const labels: Partial<Record<Job['status'], string>> = {
      en_route: 'Artisan en route',
      working: 'Work started',
      completed: 'Work marked complete',
    }
    if (labels[status]) {
      job.timeline.push({
        id: `t-${Date.now()}`,
        at: job.updatedAt,
        label: labels[status]!,
        kind: extra?.photo ? 'photo' : 'status',
        photoUrl: extra?.photoUrl,
      })
    }
    if (extra?.photo && extra.photoUrl) {
      job.photos[extra.photo] = extra.photoUrl
    }
    saveState(state)
    return delay(job)
  },

  async releaseEscrow(jobId: string): Promise<Job> {
    const job = state.jobs.find((j) => j.id === jobId)
    if (!job) throw new Error('Job not found')
    job.escrowStatus = 'released'
    job.status = 'closed'
    job.releaseRef = `STW-RLS-2026-${Date.now().toString().slice(-6)}`
    job.updatedAt = new Date().toISOString()
    saveState(state)
    return delay(job)
  },

  async submitReview(jobId: string, rating: number, text?: string): Promise<Job> {
    const job = state.jobs.find((j) => j.id === jobId)
    if (!job) throw new Error('Job not found')
    job.rating = rating
    job.reviewText = text
    saveState(state)
    return delay(job)
  },

  async createJob(input: {
    residentId: string
    artisanId: string
    trade: Trade
    description: string
    priceKobo: number
  }): Promise<Job> {
    const job: Job = {
      id: `job-${Date.now()}`,
      residentId: input.residentId,
      artisanId: input.artisanId,
      trade: input.trade,
      description: input.description,
      status: 'requested',
      priceKobo: input.priceKobo,
      escrowStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          id: `t-${Date.now()}`,
          at: new Date().toISOString(),
          label: 'Job requested',
          kind: 'status',
        },
      ],
      photos: {},
    }
    state.jobs.unshift(job)
    saveState(state)
    return delay(job)
  },

  async fundEscrow(jobId: string): Promise<Job> {
    const job = state.jobs.find((j) => j.id === jobId)
    if (!job) throw new Error('Job not found')
    job.escrowStatus = 'held'
    job.escrowRef = `STW-ESC-2026-${Date.now().toString().slice(-6)}`
    job.updatedAt = new Date().toISOString()
    const split = computePaymentSplit(job.priceKobo)
    state.stewardsFund.balanceKobo += split.fundKobo
    state.stewardsFund.monthlyInflowKobo += split.fundKobo
    state.stewardsFund.entries.unshift({
      id: `fnd-${Date.now()}`,
      type: 'contribution',
      amountKobo: split.fundKobo,
      sourceJobId: job.id,
      note: 'Escrow funded',
      at: new Date().toISOString(),
    })
    saveState(state)
    return delay(job)
  },

  async listDisputes(): Promise<Dispute[]> {
    return delay([...state.disputes])
  },

  async getDispute(id: string): Promise<Dispute | null> {
    return delay(state.disputes.find((d) => d.id === id) ?? null)
  },

  async resolveDispute(
    id: string,
    outcome: 'release' | 'refund',
    note: string,
  ): Promise<Dispute> {
    const dispute = state.disputes.find((d) => d.id === id)
    if (!dispute) throw new Error('Dispute not found')
    dispute.status = 'resolved'
    const job = state.jobs.find((j) => j.id === dispute.jobId)
    if (job) {
      job.escrowStatus = outcome === 'release' ? 'released' : 'refunded'
      job.status = 'closed'
    }
    void note
    saveState(state)
    return delay(dispute)
  },

  async getCampStats(): Promise<CampStats> {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const completedWeek = state.jobs.filter(
      (j) =>
        (j.status === 'completed' || j.status === 'closed') &&
        new Date(j.updatedAt).getTime() > weekAgo,
    ).length
    const activeArtisans = state.artisans.filter((a) => a.tier !== 'unverified').length
    const disputesPending = state.disputes.filter((d) => d.status !== 'resolved').length
    const totalDisbursed = state.jobs
      .filter((j) => j.escrowStatus === 'released')
      .reduce((sum, j) => sum + j.priceKobo, 0)

    return delay({
      jobsCompletedWeek: Math.max(completedWeek, 47),
      activeArtisans,
      avgResponseMinutes: 18,
      disputesPending,
      totalDisbursedKobo: totalDisbursed,
    })
  },

  async getPatterns(): Promise<CampPattern[]> {
    return delay([
      {
        id: 'pat-1',
        title: 'Three plumbing requests in Phase 2',
        explanation:
          'Three plumbing requests in Phase 2 in the last 72 hours — possible pipeline issue.',
        suggestedAction: 'Schedule Camp facilities inspection for Faith Avenue mains.',
        status: 'new',
        trade: 'plumber',
        area: 'Phase 2',
      },
      {
        id: 'pat-2',
        title: 'Generator repairs up 22% this week',
        explanation:
          'Generator repair requests rose 22% this week — start of harmattan season.',
        suggestedAction: 'Pre-position two generator techs on standby for Phase 2–3.',
        status: 'acknowledged',
        trade: 'generator_tech',
      },
      {
        id: 'pat-3',
        title: '12 new artisans verified this month',
        explanation:
          '12 new artisans verified this month — Trusted-tier count now at 47.',
        suggestedAction: 'Welcome orientation for new Verified artisans.',
        status: 'acting',
      },
    ])
  },

  getHeroIds() {
    return {
      memberId: HERO_MEMBER_ID,
      residentId: HERO_MEMBER_ID,
      artisanId: HERO_ARTISAN_ID,
      jobId: HERO_JOB_ID,
    }
  },

  async listParishes(): Promise<Parish[]> {
    return delay([...state.parishes])
  },

  async listApprenticeships(filters: { masterId?: string; memberId?: string } = {}) {
    let list = [...state.apprenticeships]
    if (filters.masterId) list = list.filter((a) => a.masterArtisanId === filters.masterId)
    if (filters.memberId) {
      list = list.filter((a) => a.supportedByMemberIds.includes(filters.memberId!))
    }
    return delay(list)
  },

  async listPastoralConfirmations() {
    return delay([...state.pastoralConfirmations])
  },

  async confirmStanding(id: string, note: string) {
    const row = state.pastoralConfirmations.find((c) => c.id === id)
    if (!row) throw new Error('Not found')
    row.status = 'confirmed'
    row.note = note
    row.confirmedAt = new Date().toISOString()
    saveState(state)
    return delay(row)
  },

  async listGenerosity(actorId?: string): Promise<GenerosityAct[]> {
    let list = [...state.generosity]
    if (actorId) list = list.filter((g) => g.actorId === actorId)
    return delay(list)
  },

  async getStewardsFund(): Promise<StewardsFund> {
    return delay({ ...state.stewardsFund, entries: [...state.stewardsFund.entries] })
  },

  async requestVouch(artisanId: string): Promise<VoucherRequest> {
    const req: VoucherRequest = {
      id: `vouch-${Date.now()}`,
      artisanId,
      voucherName: 'Mama Iyabo Adewale',
      voucherPhone: '+2348035567821',
      status: 'pending',
      message:
        'Good afternoon Mama Iyabo. Tunde Akinwale listed you as someone who can speak for his work. Reply YES or NO.',
    }
    state.voucherRequests.push(req)
    saveState(state)
    return delay(req)
  },

  async confirmVouch(requestId: string): Promise<VoucherRequest> {
    const req = state.voucherRequests.find((v) => v.id === requestId)
    if (!req) throw new Error('Not found')
    req.status = 'confirmed'
    req.response =
      'YES. I know Tunde from Phase 2 church. He fixed my neighbour generator last year. He is honest.'
    saveState(state)
    return delay(req)
  },

  async enrollMentor(artisanId: string, trade: Trade) {
    const row: PastoralConfirmation = {
      id: `mentor-${Date.now()}`,
      subjectType: 'artisan',
      subjectId: artisanId,
      subjectName: state.artisans.find((a) => a.id === artisanId)?.name ?? 'Artisan',
      confirmingPastorId: 'admin-adekunle',
      parishId: 'parish-camp-mowe',
      status: 'pending',
      note: `Mentor enrollment · ${trade}`,
    }
    state.pastoralConfirmations.unshift(row)
    saveState(state)
    return delay(row)
  },

  async getLineage(artisanId: string): Promise<LineageNode[]> {
    if (artisanId !== HERO_ARTISAN_ID) {
      return delay([{ id: artisanId, name: 'Artisan', tier: 'verified', role: 'self' }])
    }
    return delay([
      { id: 'master-adebayo', name: 'Chief Adebayo', tier: 'steward', role: 'master' },
      { id: HERO_ARTISAN_ID, name: 'Tunde Akinwale', tier: 'trusted', role: 'self' },
      { id: 'apprentice-emeka-001', name: 'Emeka Okonkwo', tier: 'verified', role: 'apprentice' },
    ])
  },
}
