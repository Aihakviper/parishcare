import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campDataSource } from '../lib/api/camp-data-source'
import type { ArtisanFilters } from '../lib/mock-api/camp'
import type { Job, Trade } from '../lib/types/camp'

export { useCampSession } from './useCampSession'
export type { CampSession } from './useCampSession'

export function useArtisans(filters: ArtisanFilters = {}) {
  return useQuery({
    queryKey: ['artisans', filters],
    queryFn: () => campDataSource.listArtisans(filters),
  })
}

export function useArtisan(id: string | undefined) {
  return useQuery({
    queryKey: ['artisan', id],
    queryFn: () => campDataSource.getArtisan(id!),
    enabled: !!id,
  })
}

export function useJobs(filters: {
  residentId?: string
  artisanId?: string
  status?: Job['status']
} = {}) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => campDataSource.listJobs(filters),
  })
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => campDataSource.getJob(id!),
    enabled: !!id,
  })
}

export function useCampStats() {
  return useQuery({
    queryKey: ['camp-stats'],
    queryFn: () => campDataSource.getCampStats(),
  })
}

export function usePatterns() {
  return useQuery({
    queryKey: ['patterns'],
    queryFn: () => campDataSource.getPatterns(),
  })
}

export function useDisputes() {
  return useQuery({
    queryKey: ['disputes'],
    queryFn: () => campDataSource.listDisputes(),
  })
}

export function useDispute(id: string | undefined) {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: () => campDataSource.getDispute(id!),
    enabled: !!id,
  })
}

export function useApprenticeships(filters: { masterId?: string; memberId?: string } = {}) {
  return useQuery({
    queryKey: ['apprenticeships', filters],
    queryFn: () => campDataSource.listApprenticeships(filters),
  })
}

export function usePastoralConfirmations() {
  return useQuery({
    queryKey: ['pastoral-confirmations'],
    queryFn: () => campDataSource.listPastoralConfirmations(),
  })
}

export function useGenerosity(actorId?: string) {
  return useQuery({
    queryKey: ['generosity', actorId],
    queryFn: () => campDataSource.listGenerosity(actorId),
  })
}

export function useStewardsFund() {
  return useQuery({
    queryKey: ['stewards-fund'],
    queryFn: () => campDataSource.getStewardsFund(),
  })
}

export function useLineage(artisanId: string | undefined) {
  return useQuery({
    queryKey: ['lineage', artisanId],
    queryFn: () => campDataSource.getLineage(artisanId!),
    enabled: !!artisanId,
  })
}

export function useJobMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['jobs'] })
    void qc.invalidateQueries({ queryKey: ['job'] })
    void qc.invalidateQueries({ queryKey: ['camp-stats'] })
  }

  return {
    acceptJob: useMutation({
      mutationFn: campDataSource.acceptJob,
      onSuccess: invalidate,
    }),
    updateStatus: useMutation({
      mutationFn: ({
        id,
        status,
        extra,
      }: {
        id: string
        status: Job['status']
        extra?: { photo?: 'before' | 'during' | 'after'; photoUrl?: string }
      }) => campDataSource.updateJobStatus(id, status, extra),
      onSuccess: invalidate,
    }),
    releaseEscrow: useMutation({
      mutationFn: campDataSource.releaseEscrow,
      onSuccess: invalidate,
    }),
    submitReview: useMutation({
      mutationFn: ({
        id,
        rating,
        text,
      }: {
        id: string
        rating: number
        text?: string
      }) => campDataSource.submitReview(id, rating, text),
      onSuccess: invalidate,
    }),
    createJob: useMutation({
      mutationFn: campDataSource.createJob,
      onSuccess: invalidate,
    }),
    fundEscrow: useMutation({
      mutationFn: campDataSource.fundEscrow,
      onSuccess: () => {
        invalidate()
        void qc.invalidateQueries({ queryKey: ['stewards-fund'] })
      },
    }),
    resolveDispute: useMutation({
      mutationFn: ({
        id,
        outcome,
        note,
      }: {
        id: string
        outcome: 'release' | 'refund'
        note: string
      }) => campDataSource.resolveDispute(id, outcome, note),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['disputes'] })
        invalidate()
      },
    }),
    confirmStanding: useMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) =>
        campDataSource.confirmStanding(id, note),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['pastoral-confirmations'] })
      },
    }),
    enrollMentor: useMutation({
      mutationFn: ({ artisanId, trade }: { artisanId: string; trade: Trade }) =>
        campDataSource.enrollMentor(artisanId, trade),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['pastoral-confirmations'] })
      },
    }),
  }
}