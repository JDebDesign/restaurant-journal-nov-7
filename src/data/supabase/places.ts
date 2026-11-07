import { nearbyIn, neighborhoodsOf, searchIn } from '../placeSearch'
import type { PlacesService } from '../services'
import type { Place, PriceLevel } from '../types'
import { supabase, unwrap } from './client'

export interface PlaceRow {
  id: string
  google_place_id: string
  name: string
  address: string | null
  neighborhood: string | null
  lat: number
  lng: number
  price_level: number | null
  cuisine: string | null
  google_maps_url: string | null
  website: string | null
  last_synced_at: string
}

export const toPlace = (r: PlaceRow): Place => ({
  id: r.id,
  googlePlaceId: r.google_place_id,
  name: r.name,
  address: r.address ?? '',
  neighborhood: r.neighborhood ?? '',
  lat: r.lat,
  lng: r.lng,
  priceLevel: (r.price_level as PriceLevel | null) ?? null,
  cuisine: r.cuisine ?? '',
  googleMapsUrl: r.google_maps_url ?? '',
  website: r.website,
  lastSyncedAt: r.last_synced_at,
})

// The places table is small shared reference data, so one cached fetch serves search, nearby and lookups.
const TTL = 5 * 60_000
let cache: { at: number; list: Place[] } | null = null
let inflight: Promise<Place[]> | null = null

export function allPlaces(): Promise<Place[]> {
  if (cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.list)
  inflight ??= Promise.resolve(supabase.from('places').select('*').order('name'))
    .then((res) => {
      const list = unwrap(res).map((r) => toPlace(r as PlaceRow))
      cache = { at: Date.now(), list }
      return list
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export const resetPlacesCache = () => {
  cache = null
}

export const supabasePlaces: PlacesService = {
  async search(query, near) {
    return searchIn(await allPlaces(), query, near)
  },
  async nearby(lat, lng, limit, maxMeters) {
    return nearbyIn(await allPlaces(), lat, lng, limit, maxMeters)
  },
  async getMany(ids) {
    const set = new Set(ids)
    return (await allPlaces()).filter((p) => set.has(p.id))
  },
  async listNeighborhoods() {
    return neighborhoodsOf(await allPlaces())
  },
}
