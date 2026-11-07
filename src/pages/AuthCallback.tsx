import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { LinkButton } from '@/components/ui/Button'
import { auth } from '@/data'
import { useSession } from '@/hooks/data'

/**
 * Landing page for the magic link. With Supabase the code in the URL was already exchanged by
 * auth.init() before this renders, so a session means success. In local mode the email param
 * stands in for the link.
 */
export default function AuthCallback() {
  const session = useSession()
  const [params] = useSearchParams()
  const email = params.get('email') ?? sessionStorage.getItem('recd:pending-email') ?? undefined
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (session) return
    auth.completeMagicLink(email).catch(() => setFailed(true))
  }, [session, email])

  if (session) return <Navigate to="/" replace />
  if (failed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">That sign-in link didn’t work</h1>
        <p className="text-muted">It may have expired or already been used. Request a new one and open it on this device.</p>
        <LinkButton to="/sign-in">Back to sign in</LinkButton>
      </main>
    )
  }
  return <p className="p-6" role="status">Signing you in…</p>
}
