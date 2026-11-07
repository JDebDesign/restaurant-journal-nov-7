import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)')

const browser = typeof window !== 'undefined'

export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce', persistSession: browser, autoRefreshToken: browser, detectSessionInUrl: browser },
})

export const PHOTO_BUCKET = 'visit-photos'

export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}

/** Throws the Supabase error (so React Query / callers see a real Error), otherwise returns data. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
