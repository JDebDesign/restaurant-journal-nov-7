import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import { auth, journal, photos, places } from '@/data'
import type { NewWantInput } from '@/data/services'
import type { Place, VisitPatch } from '@/data'
import { buildEntries } from '@/lib/recs'

export function useSession() {
  return useSyncExternalStore(auth.subscribe, auth.getSession)
}

const useUserId = () => useSession()?.userId ?? 'anon'

/** All journal queries share the ['j', userId] prefix so one invalidate refreshes everything. */
function useJ() {
  const userId = useUserId()
  const qc = useQueryClient()
  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ['j', userId] }), [qc, userId])
  return { userId, invalidate }
}

export const useTags = () => useQuery({ queryKey: ['tags'], queryFn: () => journal.listTags(), staleTime: Infinity })

export function useVisits() {
  const { userId } = useJ()
  return useQuery({ queryKey: ['j', userId, 'visits'], queryFn: () => journal.listVisits() })
}

export function useVisit(id: string | undefined) {
  const { userId } = useJ()
  return useQuery({ queryKey: ['j', userId, 'visit', id], queryFn: () => journal.getVisit(id!), enabled: !!id })
}

export function usePlaces(ids: string[]) {
  const key = [...new Set(ids)].sort()
  return useQuery({
    queryKey: ['places', key],
    queryFn: () => places.getMany(key),
    enabled: key.length > 0,
    staleTime: Infinity,
    placeholderData: (prev) => prev,
  })
}

export function usePlace(id: string | undefined) {
  const q = usePlaces(id ? [id] : [])
  return { ...q, data: q.data?.find((p) => p.id === id) }
}

export const useNeighborhoods = () =>
  useQuery({ queryKey: ['hoods'], queryFn: () => places.listNeighborhoods(), staleTime: Infinity })

/** One entry per visited place, ready for filtering and recs. */
export function useEntries() {
  const visits = useVisits()
  const ids = (visits.data ?? []).map((v) => v.placeId)
  const pl = usePlaces(ids)
  const loading = visits.isPending || (ids.length > 0 && pl.data === undefined)
  const entries = visits.data && pl.data ? buildEntries(visits.data, pl.data) : []
  return { entries, loading, visits: visits.data ?? [] }
}

export function useWant() {
  const { userId } = useJ()
  return useQuery({ queryKey: ['j', userId, 'want'], queryFn: () => journal.listWant() })
}

export function useShares() {
  const { userId } = useJ()
  return useQuery({ queryKey: ['j', userId, 'shares'], queryFn: () => journal.listShares() })
}

export function useUnattachedPhotos() {
  const { userId } = useJ()
  return useQuery({
    queryKey: ['j', userId, 'photos'],
    queryFn: async () => (await photos.list()).filter((p) => p.visitId === null),
  })
}

export function usePhotoUrl(id: string | undefined) {
  const { userId } = useJ()
  return useQuery({ queryKey: ['photo', userId, id], queryFn: () => photos.getUrl(id!), enabled: !!id, staleTime: Infinity })
}

export function useCreateVisit() {
  const { invalidate } = useJ()
  return useMutation({
    mutationFn: (input: { placeId: string; visitedOn?: string; photoIds?: string[] }) => journal.createVisit(input),
    onSuccess: invalidate,
  })
}

export function useUpdateVisit() {
  const { userId, invalidate } = useJ()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: VisitPatch }) => journal.updateVisit(id, patch),
    onSuccess: (v) => {
      qc.setQueryData(['j', userId, 'visit', v.id], v)
      return invalidate()
    },
  })
}

export function useDeleteVisit() {
  const { invalidate } = useJ()
  return useMutation({ mutationFn: (id: string) => journal.deleteVisit(id), onSuccess: invalidate })
}

export function useAddWant() {
  const { invalidate } = useJ()
  return useMutation({ mutationFn: (i: NewWantInput) => journal.addWant(i), onSuccess: invalidate })
}

export function useRemoveWant() {
  const { invalidate } = useJ()
  return useMutation({ mutationFn: (id: string) => journal.removeWant(id), onSuccess: invalidate })
}

export function useConvertWant() {
  const { invalidate } = useJ()
  return useMutation({ mutationFn: (id: string) => journal.convertWant(id), onSuccess: invalidate })
}

export function useAttachPhotos() {
  const { invalidate } = useJ()
  return useMutation({
    mutationFn: ({ photoIds, visitId }: { photoIds: string[]; visitId: string }) => photos.attach(photoIds, visitId),
    onSuccess: invalidate,
  })
}

export function useRemovePhoto() {
  const { invalidate } = useJ()
  return useMutation({ mutationFn: (id: string) => photos.remove(id), onSuccess: invalidate })
}

export const placeIndex = (list: Place[] | undefined) => new Map((list ?? []).map((p) => [p.id, p]))

