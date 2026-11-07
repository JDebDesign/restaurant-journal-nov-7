// Tiny localStorage-backed "database", scoped per signed-in user.
import { buildDemoData } from '../fixtures/seed'
import type { PhotoMeta, Share, Visit, WantToTry } from '../types'

export interface DB {
  visits: Visit[]
  want: WantToTry[]
  shares: Share[]
  photos: PhotoMeta[]
}

export const SESSION_KEY = 'recd:session'
export const DEMO_EMAIL = 'alanna@example.com'

const dataKey = (userId: string) => `recd:data:${userId}`

export const userIdFor = (email: string) => 'u_' + email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')

export function currentUser(): { userId: string; email: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return s?.userId ? { userId: s.userId, email: s.email } : null
  } catch {
    return null
  }
}

const empty = (): DB => ({ visits: [], want: [], shares: [], photos: [] })

export function readDB(): DB {
  const u = currentUser()
  if (!u) throw new Error('Not signed in')
  const raw = localStorage.getItem(dataKey(u.userId))
  if (raw) {
    try {
      return { ...empty(), ...JSON.parse(raw) }
    } catch {
      /* fall through to fresh */
    }
  }
  const db = u.email === DEMO_EMAIL ? { ...empty(), ...buildDemoData() } : empty()
  writeDB(db)
  return db
}

export function writeDB(db: DB) {
  const u = currentUser()
  if (!u) throw new Error('Not signed in')
  localStorage.setItem(dataKey(u.userId), JSON.stringify(db))
}

export function update<T>(fn: (db: DB) => T): T {
  const db = readDB()
  const out = fn(db)
  writeDB(db)
  return out
}

export const uid = () => crypto.randomUUID()

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function shortSlug(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Public share pages are readable logged-out, so share records live in a shared, un-scoped index too. */
const PUBLIC_SHARES_KEY = 'recd:public-shares'
export function publishShare(share: Share) {
  const all = JSON.parse(localStorage.getItem(PUBLIC_SHARES_KEY) || '{}')
  all[share.slug] = share
  localStorage.setItem(PUBLIC_SHARES_KEY, JSON.stringify(all))
}
export function readPublicShare(slug: string): Share | null {
  try {
    return JSON.parse(localStorage.getItem(PUBLIC_SHARES_KEY) || '{}')[slug] ?? null
  } catch {
    return null
  }
}
