import type { AuthService } from '../services'
import type { Profile, Session } from '../types'
import { SESSION_KEY, userIdFor } from './db'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const PROFILE_KEY = (userId: string) => `recd:profile:${userId}`

function defaultProfile(email: string): Profile {
  const local = email.split('@')[0] ?? ''
  const name = local ? local[0].toUpperCase() + local.slice(1) : ''
  return { displayName: name, homeCity: 'Atlanta' }
}

function readProfile(userId: string, email: string): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY(userId))
    if (raw) return { ...defaultProfile(email), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return defaultProfile(email)
}

let cached: { raw: string | null; session: Session | null } = { raw: null, session: null }

export const localAuth: AuthService = {
  async init() {},
  getSession() {
    // Stable reference between calls so useSyncExternalStore doesn't loop.
    let raw: string | null = null
    try {
      raw = localStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
    const profileRaw = raw ? localStorage.getItem(PROFILE_KEY(JSON.parse(raw).userId)) : null
    const key = raw + '|' + profileRaw
    if (cached.raw === key) return cached.session
    let session: Session | null = null
    if (raw) {
      const s = JSON.parse(raw) as { userId: string; email: string }
      session = { userId: s.userId, email: s.email, profile: readProfile(s.userId, s.email) }
    }
    cached = { raw: key, session }
    return session
  },
  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  async requestMagicLink(email) {
    // Backend step: supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
    sessionStorage.setItem('recd:pending-email', email.trim().toLowerCase())
  },
  async completeMagicLink(email) {
    if (!email) throw new Error('Missing email')
    const clean = email.trim().toLowerCase()
    const userId = userIdFor(clean)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, email: clean }))
    sessionStorage.removeItem('recd:pending-email')
    emit()
    return localAuth.getSession()!
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY)
    emit()
  },
  async updateProfile(patch) {
    const s = localAuth.getSession()
    if (!s) throw new Error('Not signed in')
    localStorage.setItem(PROFILE_KEY(s.userId), JSON.stringify({ ...s.profile, ...patch }))
    emit()
    return localAuth.getSession()!
  },
}
