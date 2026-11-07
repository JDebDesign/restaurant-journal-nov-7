import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TextField } from '@/components/ui/fields'
import { auth } from '@/data'
import { useSession } from '@/hooks/data'

const MIN_PASSWORD = 8

export default function SignIn() {
  const session = useSession()
  const loc = useLocation()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

  if (session) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />

  const creating = mode === 'signup'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(clean)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')
    if (creating && password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`)
    setError('')
    setBusy(true)
    try {
      if (creating) {
        const { needsConfirmation } = await auth.signUp(clean, password)
        if (needsConfirmation) setConfirmEmail(clean)
      } else {
        await auth.signIn(clean, password)
      }
      // On success the session appears and this page redirects.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m)
    setError('')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="size-12 rounded-xl" />
        <p className="text-3xl font-extrabold tracking-tight">Recd</p>
      </div>
      <h1 className="text-3xl leading-tight font-bold">Remember every spot. Recommend in seconds.</h1>
      <p className="mt-2 text-muted">Log a meal in a few taps, then send a friend the perfect rec when they ask.</p>

      {confirmEmail ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-line bg-white p-5" role="status">
          <MailCheck aria-hidden="true" className="size-8 text-brand-700" />
          <p className="text-lg font-semibold">Confirm your email</p>
          <p className="text-muted">We sent a confirmation link to <strong>{confirmEmail}</strong>. Open it on this device, then sign in.</p>
          <Button variant="ghost" onClick={() => { setConfirmEmail(null); switchMode('signin') }}>Back to sign in</Button>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Sign in or create an account" className="mt-8 flex gap-2">
            <Chip pressed={!creating} onClick={() => switchMode('signin')}>Sign in</Chip>
            <Chip pressed={creating} onClick={() => switchMode('signup')}>Create account</Chip>
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'auth-error' : undefined}
            />
            <div>
              <TextField
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete={creating ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'auth-error' : creating ? 'pw-hint' : undefined}
              />
              <div className="mt-1 flex items-center justify-between">
                {creating ? <p id="pw-hint" className="text-sm text-muted">At least {MIN_PASSWORD} characters.</p> : <span />}
                <Button variant="ghost" size="sm" aria-pressed={show} onClick={() => setShow((v) => !v)}>
                  {show ? 'Hide password' : 'Show password'}
                </Button>
              </div>
            </div>
            {error && <p id="auth-error" role="alert" className="text-sm font-medium text-red-800">{error}</p>}
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
            </Button>
            {auth.signInAsDemo && (
              <Button variant="ghost" block onClick={() => auth.signInAsDemo!()}>
                Try the demo journal
              </Button>
            )}
          </form>
        </>
      )}
    </main>
  )
}
