import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { auth } from '@/data'

/** Backend step: exchange the Supabase magic-link code for a session here. */
export default function AuthCallback() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? sessionStorage.getItem('recd:pending-email') ?? ''
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (email) auth.completeMagicLink(email).then(() => setDone(true))
  }, [email])

  if (!email) return <Navigate to="/sign-in" replace />
  if (done) return <Navigate to="/" replace />
  return <p className="p-6" role="status">Signing you in…</p>
}
