import type { AuthService } from '../services'
import type { Session } from '../types'
import { supabase } from './client'

function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (m.includes('already registered')) return 'An account with this email already exists. Try signing in.'
  if (m.includes('email not confirmed')) return 'Confirm your email first: open the link we sent you, then sign in.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
  if (m.includes('password') && m.includes('characters')) return message
  return message
}

let session: Session | null = null
let started: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

async function load(userId: string | null, email: string | null): Promise<void> {
  if (!userId) {
    session = null
    return
  }
  const { data } = await supabase.from('profiles').select('display_name, home_city').eq('id', userId).maybeSingle()
  session = {
    userId,
    email: email ?? '',
    profile: { displayName: data?.display_name ?? '', homeCity: data?.home_city ?? '' },
  }
}

export const supabaseAuth: AuthService = {
  init() {
    started ??= (async () => {
      // Restores the stored session; also finishes an email-confirmation link (supabase-js exchanges ?code= from the URL here).
      const { data } = await supabase.auth.getSession()
      await load(data.session?.user.id ?? null, data.session?.user.email ?? null)
      supabase.auth.onAuthStateChange((event, s) => {
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
        // Don't call back into supabase inside this callback (it can deadlock); defer.
        setTimeout(async () => {
          await load(s?.user.id ?? null, s?.user.email ?? null)
          emit()
        }, 0)
      })
    })()
    return started
  },
  getSession: () => session,
  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Where the confirmation link lands if the project requires confirmed emails; init() exchanges its code.
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(friendly(error.message))
    // With confirmation on, an already-registered email comes back as a user with no identities.
    if (data.user && data.user.identities?.length === 0) throw new Error('An account with this email already exists. Try signing in.')
    if (!data.session) return { needsConfirmation: true }
    await load(data.session.user.id, data.session.user.email ?? null)
    emit()
    return { needsConfirmation: false }
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(friendly(error.message))
    await load(data.user.id, data.user.email ?? null)
    emit()
  },
  async signOut() {
    await supabase.auth.signOut()
    session = null
    emit()
  },
  async updateProfile(patch) {
    if (!session) throw new Error('Not signed in')
    const { error } = await supabase
      .from('profiles')
      .update({
        ...(patch.displayName !== undefined && { display_name: patch.displayName }),
        ...(patch.homeCity !== undefined && { home_city: patch.homeCity }),
      })
      .eq('id', session.userId)
    if (error) throw new Error(error.message)
    session = { ...session, profile: { ...session.profile, ...patch } }
    emit()
    return session
  },
}
