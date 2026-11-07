// Domain types. Field names mirror the Postgres model in docs/schema.sql (camelCased)
// so a Supabase implementation can map rows 1:1.

export type Feeling = 'loved' | 'liked' | 'meh'
export type PriceLevel = 1 | 2 | 3 | 4
export type TagKind = 'occasion' | 'vibe'
export type SourceType = 'instagram' | 'tiktok' | 'maps' | 'other'

export interface Profile {
  displayName: string
  homeCity: string
}

export interface Session {
  userId: string
  email: string
  profile: Profile
}

export interface Place {
  id: string
  googlePlaceId: string
  name: string
  address: string
  neighborhood: string
  lat: number
  lng: number
  priceLevel: PriceLevel | null
  cuisine: string
  googleMapsUrl: string
  website: string | null
  lastSyncedAt: string
}

export interface Tag {
  id: string
  kind: TagKind
  label: string
}

export interface Visit {
  id: string
  placeId: string
  /** ISO date, YYYY-MM-DD */
  visitedOn: string
  feeling: Feeling | null
  note: string
  recommendable: boolean
  pricePaidLevel: PriceLevel | null
  /** "What to order": standout dishes */
  dishes: string[]
  tagIds: string[]
  photoIds: string[]
  createdAt: string
  updatedAt: string
}

export type VisitPatch = Partial<
  Pick<Visit, 'visitedOn' | 'feeling' | 'note' | 'recommendable' | 'pricePaidLevel' | 'dishes' | 'tagIds'>
>

export interface PhotoMeta {
  id: string
  /** null until attached to a visit (feeds the nudge banner) */
  visitId: string | null
  takenAt: string | null
  lat: number | null
  lng: number | null
  createdAt: string
}

export interface WantToTry {
  id: string
  placeId: string
  sourceUrl: string | null
  sourceType: SourceType | null
  note: string
  createdAt: string
  convertedVisitId: string | null
}

export interface ShareItem {
  placeId: string
  visitId: string | null
}

export interface Share {
  id: string
  slug: string
  title: string
  createdAt: string
  viewCount: number
  items: ShareItem[]
}

/** Everything the public rec card needs. Self-contained so it can travel inside a URL. */
export interface RecPayload {
  v: 1
  title: string
  items: RecItem[]
}

export interface RecItem {
  name: string
  neighborhood: string
  priceLevel: PriceLevel | null
  cuisine: string
  why: string
  dishes: string[]
  occasions: string[]
  feeling: Feeling | null
  mapsUrl: string
  reserveUrl: string
}
