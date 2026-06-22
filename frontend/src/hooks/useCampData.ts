import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campApi, type ArtisanFilters } from '../lib/mock-api/camp'
import type { Job } from '../lib/types/camp'

export function useArtisans(filters: ArtisanFilters = {}) {
  return useQuery({
    queryKey: ['artisans', filters],
    queryFn: () => campApi.listArtisans(filters),
  })
}

export function useArtisan(id: string | undefined) {
  return useQuery({
    queryKey: ['artisan', id],
    queryFn: () => campApi.getArtisan(id!),
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
    queryFn: () => campApi.listJobs(filters),
  })
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => campApi.getJob(id!),
    enabled: !!id,
  })
}

export function useCampStats() {
  return useQuery({
    queryKey: ['camp-stats'],
    queryFn: () => campApi.getCampStats(),
  })
}

export function usePatterns() {
  return useQuery({
    queryKey: ['patterns'],
    queryFn: () => campApi.getPatterns(),
  })
}

export function useDisputes() {
  return useQuery({
    queryKey: ['disputes'],
    queryFn: () => campApi.listDisputes(),
  })
}

export function useDispute(id: string | undefined) {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: () => campApi.getDispute(id!),
    enabled: !!id,
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
      mutationFn: campApi.acceptJob,
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
      }) => campApi.updateJobStatus(id, status, extra),
      onSuccess: invalidate,
    }),
    releaseEscrow: useMutation({
      mutationFn: campApi.releaseEscrow,
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
      }) => campApi.submitReview(id, rating, text),
      onSuccess: invalidate,
    }),
    createJob: useMutation({
      mutationFn: campApi.createJob,
      onSuccess: invalidate,
    }),
    fundEscrow: useMutation({
      mutationFn: campApi.fundEscrow,
      onSuccess: invalidate,
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
      }) => campApi.resolveDispute(id, outcome, note),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['disputes'] })
        invalidate()
      },
    }),
  }
}

export const HERO_IDS = campApi.getHeroIds()
