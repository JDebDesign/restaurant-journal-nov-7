import type { Feeling, Place, PriceLevel, Tag, Visit } from '@/data/types'

export const FEELING_RANK: Record<Feeling, number> = { loved: 3, liked: 2, meh: 1 }
export const rank = (f: Feeling | null) => (f ? FEELING_RANK[f] : 0)

export interface Entry {
  place: Place
  /** The visit that represents this place: best feeling, then most recent. */
  visit: Visit
  visits: Visit[]
}

export const effectivePrice = (place: Place, visit: Visit): PriceLevel | null => visit.pricePaidLevel ?? place.priceLevel

/** best feeling first, then most recent. */
export const byFeelingThenRecency = (a: Visit, b: Visit) =>
  rank(b.feeling) - rank(a.feeling) || b.visitedOn.localeCompare(a.visitedOn)

/** Collapses visits to one entry per place. */
export function buildEntries(visits: Visit[], places: Place[]): Entry[] {
  const pm = new Map(places.map((p) => [p.id, p]))
  const groups = new Map<string, Visit[]>()
  for (const v of visits) {
    if (!pm.has(v.placeId)) continue
    groups.set(v.placeId, [...(groups.get(v.placeId) ?? []), v])
  }
  return [...groups].map(([placeId, vs]) => {
    const sorted = [...vs].sort(byFeelingThenRecency)
    return { place: pm.get(placeId)!, visit: sorted[0], visits: sorted }
  })
}

export interface RecQuery {
  occasion?: string | null // tag id
  price?: PriceLevel | null
  area?: string | null // neighborhood
}

const matches = (e: Entry, q: RecQuery) =>
  (!q.occasion || e.visits.some((v) => v.tagIds.includes(q.occasion!))) &&
  (!q.price || effectivePrice(e.place, e.visit) === q.price) &&
  (!q.area || e.place.neighborhood === q.area)

/** Recommendable places matching every given constraint, best feeling first then most recent. */
export function findRecs(entries: Entry[], q: RecQuery): Entry[] {
  return entries
    .filter((e) => e.visits.some((v) => v.recommendable))
    .map((e) => ({ ...e, visit: e.visits.find((v) => v.recommendable)! }))
    .filter((e) => matches(e, q))
    .sort((a, b) => byFeelingThenRecency(a.visit, b.visit))
}

export type Constraint = keyof RecQuery

/** For an empty result: which single constraint, if dropped, yields the most matches. */
export function suggestLoosening(entries: Entry[], q: RecQuery): { drop: Constraint; count: number } | null {
  const active = (Object.keys(q) as Constraint[]).filter((k) => q[k])
  let best: { drop: Constraint; count: number } | null = null
  for (const k of active) {
    const count = findRecs(entries, { ...q, [k]: null }).length
    if (count > 0 && (!best || count > best.count)) best = { drop: k, count }
  }
  return best
}

export const tagLabel = (tags: Tag[], id: string) => tags.find((t) => t.id === id)?.label ?? id
