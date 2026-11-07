import { Bookmark, MessageCircleQuestion, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NudgeBanner } from '@/components/NudgeBanner'
import { EmptyState } from '@/components/PageHeader'
import { VisitCard } from '@/components/VisitCard'
import { Button, LinkButton } from '@/components/ui/Button'
import { journal } from '@/data'
import { useEntries, usePlaces, useSession, useVisits, useWant } from '@/hooks/data'
import { useQueryClient } from '@tanstack/react-query'

export default function Home() {
  const session = useSession()
  const visits = useVisits()
  const want = useWant()
  const recent = (visits.data ?? []).slice(0, 5)
  const places = usePlaces(recent.map((v) => v.placeId))
  const { entries } = useEntries()
  const qc = useQueryClient()
  const wantOpen = (want.data ?? []).filter((w) => !w.convertedVisitId).length
  const name = session?.profile.displayName

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{name ? `Hi ${name}` : 'Welcome'}</h1>
        <p className="text-muted">{entries.length > 0 ? `${entries.length} places in your journal` : 'Your journal starts here'}</p>
      </header>

      <NudgeBanner />

      <div className="space-y-3">
        <LinkButton to="/log" size="lg" block><Plus aria-hidden="true" className="size-6" /> Log a meal</LinkButton>
        <LinkButton to="/asked" variant="secondary" size="lg" block>
          <MessageCircleQuestion aria-hidden="true" className="size-6" /> Someone asked me
        </LinkButton>
      </div>

      <Link to="/want" className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-white px-4 hover:bg-brand-50">
        <span className="flex items-center gap-2 font-semibold"><Bookmark aria-hidden="true" className="size-5 text-brand-700" /> Want to try</span>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-700" aria-label={`${wantOpen} places`}>{wantOpen}</span>
      </Link>

      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-2 text-lg font-bold">Recent visits</h2>
        {visits.isPending ? null : recent.length === 0 ? (
          <EmptyState title="No meals logged yet">
            <p>Tap “Log a meal” after your next bite. Only the restaurant is required.</p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={async () => {
                await journal.loadDemoData()
                await qc.invalidateQueries({ queryKey: ['j'] })
              }}
            >
              Load demo data
            </Button>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {recent.map((v) => {
              const place = places.data?.find((p) => p.id === v.placeId)
              return place ? <li key={v.id}><VisitCard visit={v} place={place} /></li> : null
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
