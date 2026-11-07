// The single place that decides which implementation the app uses.
//   - Supabase when VITE_SUPABASE_URL is set (see .env.example)
//   - browser storage + fixture places otherwise, or when VITE_DATA_BACKEND=local (used by e2e tests)
import type { AuthService, JournalRepo, PhotoStore, PlacesService } from './services'

export const backend: 'local' | 'supabase' =
  import.meta.env.VITE_DATA_BACKEND === 'local' || !import.meta.env.VITE_SUPABASE_URL ? 'local' : 'supabase'

const impl = backend === 'supabase' ? await import('./supabase') : await import('./local')

export const auth: AuthService = impl.auth
export const places: PlacesService = impl.places
export const journal: JournalRepo = impl.journal
export const photos: PhotoStore = impl.photos
export type * from './types'
