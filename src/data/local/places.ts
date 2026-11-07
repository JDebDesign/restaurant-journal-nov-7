import { FIXTURE_PLACES } from '../fixtures/places'
import { nearbyIn, neighborhoodsOf, searchIn } from '../placeSearch'
import type { PlacesService } from '../services'

// Backend step (Google): checks the `places` table first, then a server-side Places (New) call.
export const localPlaces: PlacesService = {
  async search(query, near) {
    return searchIn(FIXTURE_PLACES, query, near)
  },
  async nearby(lat, lng, limit, maxMeters) {
    return nearbyIn(FIXTURE_PLACES, lat, lng, limit, maxMeters)
  },
  async getMany(ids) {
    const set = new Set(ids)
    return FIXTURE_PLACES.filter((p) => set.has(p.id))
  },
  async listNeighborhoods() {
    return neighborhoodsOf(FIXTURE_PLACES)
  },
}
