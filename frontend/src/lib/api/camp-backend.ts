import { apiRequest } from './client'
import type {
  Apprenticeship,
  Artisan,
  CampPattern,
  CampStats,
  Dispute,
  GenerosityAct,
  Job,
  JobStatus,
  LineageNode,
  Parish,
  PastoralConfirmation,
  StewardsFund,
  Trade,
  VoucherRequest,
} from '../types/camp'
import type { ArtisanFilters } from '../mock-api/camp'

/** Snake_case payloads from FastAPI — mapped to frontend camp types. */
function mapArtisan(raw: Record<string, unknown>): Artisan {
  return {
    id: String(raw.id),
    name: String(raw.name),
    phone: String(raw.phone),
    trade: raw.trade as Artisan['trade'],
    serviceArea: String(raw.service_area ?? raw.serviceArea ?? ''),
    tier: raw.tier as Artisan['tier'],
    trustScore: Number(raw.trust_score ?? raw.trustScore ?? 0),
    completedJobs: Number(raw.completed_jobs ?? raw.completedJobs ?? 0),
    averageRating: Number(raw.average_rating ?? raw.averageRating ?? 0),
    yearsExperience: Number(raw.years_experience ?? raw.yearsExperience ?? 0),
    languages: (raw.languages as string[]) ?? [],
    voiceIntro: raw.voice_intro as Artisan['voiceIntro'],
    workPhotos: (raw.work_photos as string[]) ?? [],
    vouchers: ((raw.vouchers as Artisan['vouchers']) ?? []).map((v) => ({
      id: v.id,
      fromName: (v as { from_name?: string }).from_name ?? v.fromName,
      fromRole: (v as { from_role?: string }).from_role ?? v.fromRole,
      date: v.date,
    })),
    ninVerified: Boolean(raw.nin_verified ?? raw.ninVerified),
    distanceKm: raw.distance_km != null ? Number(raw.distance_km) : undefined,
    availableNow: raw.available_now != null ? Boolean(raw.available_now) : undefined,
    responseMinutes:
      raw.response_minutes != null ? Number(raw.response_minutes) : undefined,
    photoUrl: raw.photo_url != null ? String(raw.photo_url) : undefined,
  }
}

function mapJob(raw: Record<string, unknown>): Job {
  return {
    id: String(raw.id),
    residentId: String(raw.resident_id ?? raw.member_id ?? raw.residentId),
    artisanId: String(raw.artisan_id ?? raw.artisanId),
    trade: raw.trade as Trade,
    description: String(raw.description),
    voiceDescription: raw.voice_description as Job['voiceDescription'],
    status: raw.status as JobStatus,
    priceKobo: Number(raw.price_kobo ?? raw.priceKobo),
    escrowStatus: raw.escrow_status as Job['escrowStatus'],
    escrowRef: raw.escrow_ref != null ? String(raw.escrow_ref) : undefined,
    releaseRef: raw.release_ref != null ? String(raw.release_ref) : undefined,
    createdAt: String(raw.created_at ?? raw.createdAt),
    updatedAt: String(raw.updated_at ?? raw.updatedAt),
    timeline: ((raw.timeline as Job['timeline']) ?? []).map((e) => ({
      ...e,
      photoUrl: (e as { photo_url?: string }).photo_url ?? e.photoUrl,
      voiceNote: (e as { voice_note?: Job['voiceDescription'] }).voice_note ?? e.voiceNote,
    })),
    photos: (raw.photos as Job['photos']) ?? {},
    rating: raw.rating != null ? Number(raw.rating) : undefined,
    reviewText: raw.review_text != null ? String(raw.review_text) : undefined,
    isHero: raw.is_hero != null ? Boolean(raw.is_hero) : undefined,
  }
}

function qs(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const s = query.toString()
  return s ? `?${s}` : ''
}

/**
 * Live Camp API client. Paths are relative to `VITE_API_BASE_URL` (e.g. http://localhost:8000/api/v1).
 * Backend contract: see `BACKEND_CAMP_API.md` at repo root.
 */
export const campBackendApi = {
  async listArtisans(filters: ArtisanFilters = {}): Promise<Artisan[]> {
    const rows = await apiRequest<Record<string, unknown>[]>(
      `/camp/artisans${qs({
        trade: filters.trade,
        tier: filters.tier,
        near: filters.near,
        q: filters.query,
      })}`,
    )
    return rows.map(mapArtisan)
  },

  async getArtisan(id: string): Promise<Artisan | null> {
    try {
      return mapArtisan(await apiRequest<Record<string, unknown>>(`/camp/artisans/${id}`))
    } catch {
      return null
    }
  },

  async listJobs(filters: {
    residentId?: string
    artisanId?: string
    status?: Job['status']
  } = {}): Promise<Job[]> {
    const rows = await apiRequest<Record<string, unknown>[]>(
      `/camp/jobs${qs({
        member_id: filters.residentId,
        artisan_id: filters.artisanId,
        status: filters.status,
      })}`,
    )
    return rows.map(mapJob)
  },

  async getJob(id: string): Promise<Job | null> {
    try {
      return mapJob(await apiRequest<Record<string, unknown>>(`/camp/jobs/${id}`))
    } catch {
      return null
    }
  },

  async acceptJob(jobId: string): Promise<Job> {
    return mapJob(
      await apiRequest<Record<string, unknown>>(`/camp/jobs/${jobId}/accept`, {
        method: 'POST',
      }),
    )
  },

  async updateJobStatus(
    jobId: string,
    status: Job['status'],
    extra?: { photo?: 'before' | 'during' | 'after'; photoUrl?: string },
  ): Promise<Job> {
    return mapJob(
      await apiRequest<Record<string, unknown>>(`/camp/jobs/${jobId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          photo: extra?.photo,
          photo_url: extra?.photoUrl,
        }),
      }),
    )
  },

  async releaseEscrow(jobId: string): Promise<Job> {
    return mapJob(
      await apiRequest<Record<string, unknown>>(`/camp/jobs/${jobId}/release-escrow`, {
        method: 'POST',
      }),
    )
  },

  async submitReview(jobId: string, rating: number, text?: string): Promise<Job> {
    return mapJob(
      await apiRequest<Record<string, unknown>>(`/camp/jobs/${jobId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, text }),
      }),
    )
  },

  async createJob(input: {
    residentId: string
    artisanId: string
    trade: Trade
    description: string
    priceKobo: number
  }): Promise<Job> {
    return mapJob(
      await apiRequest<Record<string, unknown>>('/camp/jobs', {
        method: 'POST',
        body: JSON.stringify({
          artisan_id: input.artisanId,
          trade: input.trade,
          description: input.description,
          price_kobo: input.priceKobo,
        }),
      }),
    )
  },

  async fundEscrow(jobId: string): Promise<Job> {
    return mapJob(
      await apiRequest<Record<string, unknown>>(`/camp/jobs/${jobId}/fund-escrow`, {
        method: 'POST',
      }),
    )
  },

  async listDisputes(): Promise<Dispute[]> {
    return apiRequest<Dispute[]>('/camp/disputes')
  },

  async getDispute(id: string): Promise<Dispute | null> {
    try {
      return await apiRequest<Dispute>(`/camp/disputes/${id}`)
    } catch {
      return null
    }
  },

  async resolveDispute(
    id: string,
    outcome: 'release' | 'refund',
    note: string,
  ): Promise<Dispute> {
    return apiRequest<Dispute>(`/camp/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome, note }),
    })
  },

  async getCampStats(): Promise<CampStats> {
    return apiRequest<CampStats>('/camp/stats')
  },

  async getPatterns(): Promise<CampPattern[]> {
    return apiRequest<CampPattern[]>('/camp/patterns')
  },

  async listParishes(): Promise<Parish[]> {
    return apiRequest<Parish[]>('/camp/parishes')
  },

  async listApprenticeships(filters: { masterId?: string; memberId?: string } = {}) {
    return apiRequest<Apprenticeship[]>(
      `/camp/apprenticeships${qs({
        master_id: filters.masterId,
        member_id: filters.memberId,
      })}`,
    )
  },

  async listPastoralConfirmations() {
    return apiRequest<PastoralConfirmation[]>('/camp/pastoral-confirmations')
  },

  async confirmStanding(id: string, note: string) {
    return apiRequest<PastoralConfirmation>(`/camp/pastoral-confirmations/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
  },

  async listGenerosity(actorId?: string): Promise<GenerosityAct[]> {
    return apiRequest<GenerosityAct[]>(
      `/camp/generosity${qs({ actor_id: actorId })}`,
    )
  },

  async getStewardsFund(): Promise<StewardsFund> {
    return apiRequest<StewardsFund>('/camp/stewards-fund')
  },

  async requestVouch(artisanId: string): Promise<VoucherRequest> {
    return apiRequest<VoucherRequest>('/camp/vouch-requests', {
      method: 'POST',
      body: JSON.stringify({ artisan_id: artisanId }),
    })
  },

  async confirmVouch(requestId: string): Promise<VoucherRequest> {
    return apiRequest<VoucherRequest>(`/camp/vouch-requests/${requestId}/confirm`, {
      method: 'POST',
    })
  },

  async enrollMentor(artisanId: string, trade: Trade) {
    return apiRequest<PastoralConfirmation>('/camp/mentor-enrollments', {
      method: 'POST',
      body: JSON.stringify({ artisan_id: artisanId, trade }),
    })
  },

  async getLineage(artisanId: string): Promise<LineageNode[]> {
    return apiRequest<LineageNode[]>(`/camp/artisans/${artisanId}/lineage`)
  },
}
