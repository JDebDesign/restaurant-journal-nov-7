// The single place that decides which implementation the app uses.
// Backend step: swap these for the Supabase-backed implementations.
import { localAuth } from './local/auth'
import { localJournal } from './local/journal'
import { localPhotos } from './local/photos'
import { localPlaces } from './local/places'

export const auth = localAuth
export const places = localPlaces
export const journal = localJournal
export const photos = localPhotos
export type * from './types'
