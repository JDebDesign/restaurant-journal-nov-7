// Search/nearby over an in-memory list of places. Shared by the local and Supabase backends:
// the places table is small reference data today, so matching happens client-side.
// Backend step: when places come from Google, move search to a server-side proxy.
import { haversine } from '@/lib/geo'
import type { Place } from './types'

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’.]/g, '').replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()

function score(query: string, name: string, extra: string): number {
  const q = norm(query)
  const n = norm(name)
  if (!q) return 0
  if (n === q) return 100
  if (n.startsWith(q)) return 80
  if (n.split(' ').some((w) => w.startsWith(q))) return 60
  if (n.includes(q)) return 40
  const tokens = q.split(' ')
  if (tokens.every((t) => n.includes(t))) return 30
  if (norm(extra).includes(q)) return 10
  return 0
}

export function searchIn(list: Place[], query: string, near?: { lat: number; lng: number }): Place[] {
  return list
    .map((p) => ({ p, s: score(query, p.name, `${p.cuisine} ${p.neighborhood}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (near ? haversine(near, a.p) - haversine(near, b.p) : a.p.name.localeCompare(b.p.name)))
    .slice(0, 8)
    .map((x) => x.p)
}

export function nearbyIn(list: Place[], lat: number, lng: number, limit = 3, maxMeters = 600): Place[] {
  return list
    .map((p) => ({ p, d: haversine({ lat, lng }, p) }))
    .filter((x) => x.d <= maxMeters)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.p)
}

export const neighborhoodsOf = (list: Place[]) => [...new Set(list.map((p) => p.neighborhood))].sort()
