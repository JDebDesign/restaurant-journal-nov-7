import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/fields'
import { useToast } from '@/components/ui/Toast'
import { auth, journal } from '@/data'
import { useSession } from '@/hooks/data'
import { useQueryClient } from '@tanstack/react-query'

export default function Settings() {
  const session = useSession()
  const nav = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [name, setName] = useState(session?.profile.displayName ?? '')
  const [city, setCity] = useState(session?.profile.homeCity ?? '')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setName(session?.profile.displayName ?? '')
    setCity(session?.profile.homeCity ?? '')
  }, [session?.userId]) // eslint-disable-line

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await auth.updateProfile({ displayName: name.trim(), homeCity: city.trim() })
    toast('Profile saved')
  }

  const exportData = async () => {
    const data = await journal.exportAll()
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `recd-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <form onSubmit={saveProfile} className="space-y-3">
        <h2 className="text-lg font-bold">Profile</h2>
        <p className="text-sm text-muted">Signed in as {session?.email}</p>
        <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        <TextField label="Home city" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button type="submit" block>Save profile</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Your data</h2>
        <Button variant="secondary" block onClick={exportData}><Download aria-hidden="true" className="size-4" /> Export my data (JSON)</Button>
        <Button
          variant="secondary"
          block
          onClick={async () => {
            await journal.loadDemoData()
            await qc.invalidateQueries({ queryKey: ['j'] })
            toast('Demo data loaded')
          }}
        >
          Load demo data
        </Button>
        {confirmClear ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                await journal.clearAll()
                await qc.invalidateQueries({ queryKey: ['j'] })
                setConfirmClear(false)
                toast('All data deleted')
              }}
            >
              Yes, delete everything
            </Button>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="danger" block onClick={() => setConfirmClear(true)}>Delete all my data</Button>
        )}
      </section>

      <Button
        variant="secondary"
        block
        onClick={async () => {
          await auth.signOut()
          qc.clear()
          nav('/sign-in', { replace: true })
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
