import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, LinkButton } from '@/components/ui/Button'
import { TextField } from '@/components/ui/fields'
import { auth } from '@/data'
import { DEMO_EMAIL } from '@/data/local/db'
import { useSession } from '@/hooks/data'

export default function SignIn() {
  const session = useSession()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (session) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(clean)) return setError('Enter a valid email address.')
    setError('')
    await auth.requestMagicLink(clean)
    setSent(clean)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="size-12 rounded-xl" />
        <p className="text-3xl font-extrabold tracking-tight">Recd</p>
      </div>
      <h1 className="text-3xl leading-tight font-bold">Remember every spot. Recommend in seconds.</h1>
      <p className="mt-2 text-muted">Log a meal in a few taps, then send a friend the perfect rec when they ask.</p>

      {sent ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-line bg-white p-5" role="status">
          <MailCheck aria-hidden="true" className="size-8 text-brand-700" />
          <p className="text-lg font-semibold">Check your email</p>
          <p className="text-muted">We sent a sign-in link to <strong>{sent}</strong>. Tap it to continue.</p>
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-muted">
            <p className="mb-2 font-semibold text-ink">Prototype only</p>
            <p className="mb-3">Real emails arrive with the Supabase backend. For now, open the link yourself:</p>
            <LinkButton to={`/auth/callback?email=${encodeURIComponent(sent)}`} block>Open magic link</LinkButton>
          </div>
          <Button variant="ghost" onClick={() => setSent(null)}>Use a different email</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-3" noValidate>
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={error ? 'email-error' : undefined}
            aria-invalid={!!error}
          />
          {error && <p id="email-error" role="alert" className="text-sm font-medium text-red-800">{error}</p>}
          <Button type="submit" size="lg" block>Email me a sign-in link</Button>
          <Button
            variant="ghost"
            block
            onClick={async () => {
              await auth.requestMagicLink(DEMO_EMAIL)
              await auth.completeMagicLink(DEMO_EMAIL)
            }}
          >
            Try the demo journal
          </Button>
        </form>
      )}
    </main>
  )
}
