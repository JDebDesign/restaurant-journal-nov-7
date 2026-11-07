// Browser-only auth for demo mode and e2e tests. Accounts live in localStorage and never leave the
// device. The password hash is NOT a security boundary here; real auth is the Supabase implementation.
import type { AuthService } from '../services'
import type { Profile, Session } from '../types'
import { DEMO_EMAIL, SESSION_KEY, userIdFor } from './db'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const PROFILE_KEY = (userId: string) => `recd:profile:${userId}`
const USERS_KEY = 'recd:users'

type Users = Record<string, { userId: string; hash: string }>
const readUsers = (): Users => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
  } catch {
    return {}
  }
}

async function hash(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email}\u0000${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

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

function startSession(email: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userIdFor(email), email }))
  emit()
}

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
  async signUp(email, password) {
    const clean = email.trim().toLowerCase()
    const users = readUsers()
    if (users[clean] || clean === DEMO_EMAIL) throw new Error('An account with this email already exists. Try signing in.')
    users[clean] = { userId: userIdFor(clean), hash: await hash(clean, password) }
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    startSession(clean)
    return { needsConfirmation: false }
  },
  async signIn(email, password) {
    const clean = email.trim().toLowerCase()
    const u = readUsers()[clean]
    if (!u || u.hash !== (await hash(clean, password))) throw new Error('Incorrect email or password.')
    startSession(clean)
  },
  async signInAsDemo() {
    startSession(DEMO_EMAIL)
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
