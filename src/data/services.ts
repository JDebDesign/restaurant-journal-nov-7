// Service contracts the UI depends on. Today they are backed by `data/local/*`
// (localStorage + IndexedDB). The Supabase step adds `data/supabase/*` implementing
// the same interfaces; no page or component should import from `data/local` directly.

import type {
  PhotoMeta, Place, Profile, RecPayload, Session, Share, ShareItem, SourceType, Tag, Visit, VisitPatch, WantToTry,
} from './types'

export interface AuthService {
  /** Resolves once the stored session (and any email-confirmation code in the URL) has been processed. Await before first render. */
  init(): Promise<void>
  getSession(): Session | null
  subscribe(cb: () => void): () => void
  /**
   * Creates an account and signs in. Resolves `needsConfirmation: true` (and no session) when the
   * backend requires the email to be confirmed first. Rejects with a readable message.
   */
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>
  /** Rejects with a readable message ("Incorrect email or password.") on failure. */
  signIn(email: string, password: string): Promise<void>
  /** Local demo mode only: sign in as the pre-seeded demo user without a password. */
  signInAsDemo?(): Promise<void>
  signOut(): Promise<void>
  updateProfile(patch: Partial<Profile>): Promise<Session>
}

export interface PlacesService {
  search(query: string, near?: { lat: number; lng: number }): Promise<Place[]>
  nearby(lat: number, lng: number, limit?: number, maxMeters?: number): Promise<Place[]>
  getMany(ids: string[]): Promise<Place[]>
  listNeighborhoods(): Promise<string[]>
}

export interface NewWantInput {
  placeId: string
  sourceUrl?: string | null
  sourceType?: SourceType | null
  note?: string
}

export interface JournalRepo {
  listTags(): Promise<Tag[]>

  listVisits(): Promise<Visit[]>
  getVisit(id: string): Promise<Visit | null>
  createVisit(input: { placeId: string; visitedOn?: string; photoIds?: string[] }): Promise<Visit>
  updateVisit(id: string, patch: VisitPatch): Promise<Visit>
  deleteVisit(id: string): Promise<void>

  listWant(): Promise<WantToTry[]>
  addWant(input: NewWantInput): Promise<WantToTry>
  removeWant(id: string): Promise<void>
  /** Creates a visit for the place and links it back to the want-to-try row. */
  convertWant(id: string): Promise<Visit>

  listShares(): Promise<Share[]>
  createShare(input: { title: string; items: ShareItem[]; payload: RecPayload; thumbs?: (string | null)[] }): Promise<Share>
  getShareBySlug(slug: string): Promise<Share | null>
  recordShareView(slug: string): Promise<void>

  exportAll(): Promise<unknown>
  loadDemoData(): Promise<void>
  clearAll(): Promise<void>
}

export interface PhotoStore {
  /** Stores an (already downscaled) image blob plus its EXIF-derived metadata. */
  add(blob: Blob, meta: { takenAt: string | null; lat: number | null; lng: number | null }): Promise<PhotoMeta>
  list(): Promise<PhotoMeta[]>
  /** Object URL for display; callers don't need to revoke (cached per id). */
  getUrl(id: string): Promise<string | null>
  attach(photoIds: string[], visitId: string): Promise<void>
  remove(id: string): Promise<void>
}
