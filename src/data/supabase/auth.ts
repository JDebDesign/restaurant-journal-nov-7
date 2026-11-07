import type { AuthService } from '../services'
import type { Session } from '../types'
import { supabase } from './client'

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
      // Also completes a magic-link sign-in: supabase-js exchanges ?code= from the URL here.
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
  async requestMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    })
    if (error) throw new Error(error.message)
  },
  async completeMagicLink() {
    // The code exchange already happened in init(); this just reports the result.
    if (!session) throw new Error('This sign-in link is invalid or has expired.')
    return session
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
