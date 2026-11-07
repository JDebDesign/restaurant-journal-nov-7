/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** "local" forces browser-storage mode even when Supabase env vars are set. */
  readonly VITE_DATA_BACKEND?: 'local' | 'supabase'
}
