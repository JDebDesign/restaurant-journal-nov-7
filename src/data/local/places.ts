import { haversine } from '@/lib/geo'
import { FIXTURE_PLACES } from '../fixtures/places'
import type { PlacesService } from '../services'

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

// Backend step: the Supabase impl checks the `places` table first and falls back to a
// server-side Google Places (New) call, upserting results by google_place_id.
export const localPlaces: PlacesService = {
  async search(query, near) {
    return FIXTURE_PLACES.map((p) => ({ p, s: score(query, p.name, `${p.cuisine} ${p.neighborhood}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || (near ? haversine(near, a.p) - haversine(near, b.p) : a.p.name.localeCompare(b.p.name)))
      .slice(0, 8)
      .map((x) => x.p)
  },
  async nearby(lat, lng, limit = 3, maxMeters = 600) {
    return FIXTURE_PLACES.map((p) => ({ p, d: haversine({ lat, lng }, p) }))
      .filter((x) => x.d <= maxMeters)
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((x) => x.p)
  },
  async getMany(ids) {
    const set = new Set(ids)
    return FIXTURE_PLACES.filter((p) => set.has(p.id))
  },
  async listNeighborhoods() {
    return [...new Set(FIXTURE_PLACES.map((p) => p.neighborhood))].sort()
  },
}
