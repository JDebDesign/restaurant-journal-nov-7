import type { Feeling, PriceLevel } from '@/data/types'
import { type Entry, effectivePrice } from './recs'

export interface Filters {
  query: string
  occasions: string[] // tag ids, match ANY within the group
  vibes: string[]
  price: PriceLevel | null
  neighborhood: string | null
  feeling: Feeling | null
  recommendableOnly: boolean
}

export const EMPTY_FILTERS: Filters = {
  query: '', occasions: [], vibes: [], price: null, neighborhood: null, feeling: null, recommendableOnly: false,
}

export const activeFilterCount = (f: Filters) =>
  (f.query.trim() ? 1 : 0) + (f.occasions.length ? 1 : 0) + (f.vibes.length ? 1 : 0) + (f.price ? 1 : 0) +
  (f.neighborhood ? 1 : 0) + (f.feeling ? 1 : 0) + (f.recommendableOnly ? 1 : 0)

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Groups AND together; selections inside the occasion / vibe groups OR together. */
export function applyFilters(entries: Entry[], f: Filters): Entry[] {
  const q = norm(f.query.trim())
  return entries.filter((e) => {
    // A visit-level filter must be satisfied by a single visit.
    const visitOk = e.visits.some(
      (v) =>
        (!f.occasions.length || f.occasions.some((t) => v.tagIds.includes(t))) &&
        (!f.vibes.length || f.vibes.some((t) => v.tagIds.includes(t))) &&
        (!f.feeling || v.feeling === f.feeling) &&
        (!f.recommendableOnly || v.recommendable) &&
        (!f.price || effectivePrice(e.place, v) === f.price),
    )
    if (!visitOk) return false
    if (f.neighborhood && e.place.neighborhood !== f.neighborhood) return false
    if (q) {
      const hay = norm(
        [e.place.name, e.place.cuisine, e.place.neighborhood, ...e.visits.flatMap((v) => [v.note, ...v.dishes])].join(' \n '),
      )
      if (!hay.includes(q)) return false
    }
    return true
  })
}
