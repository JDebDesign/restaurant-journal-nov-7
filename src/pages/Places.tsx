import { SlidersHorizontal } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FeelingBadge } from '@/components/FeelingBadge'
import { FilterSheet } from '@/components/FilterSheet'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PhotoThumb } from '@/components/PhotoThumb'
import { Button, LinkButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useEntries, useNeighborhoods, useTags } from '@/hooks/data'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'
import { EMPTY_FILTERS, type Filters, activeFilterCount, applyFilters } from '@/lib/filters'
import { priceStr } from '@/lib/labels'
import { Link } from 'react-router-dom'
import { effectivePrice } from '@/lib/recs'

const PlaceMap = lazy(() => import('@/components/PlaceMap'))

export default function Places() {
  const nav = useNavigate()
  const { entries, loading } = useEntries()
  const { data: tags = [] } = useTags()
  const { data: hoods = [] } = useNeighborhoods()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [open, setOpen] = useState(false)

  const shown = useMemo(
    () => applyFilters(entries, filters).sort((a, b) => b.visit.visitedOn.localeCompare(a.visit.visitedOn)),
    [entries, filters],
  )
  const n = activeFilterCount({ ...filters, query: '' })
  const tagLabel = (id: string) => tags.find((t) => t.id === id)?.label ?? id

  const summary: string[] = [
    ...filters.occasions.map(tagLabel), ...filters.vibes.map(tagLabel),
    ...(filters.price ? [priceStr(filters.price)] : []), ...(filters.neighborhood ? [filters.neighborhood] : []),
    ...(filters.feeling ? [filters.feeling] : []), ...(filters.recommendableOnly ? ['recommendable'] : []),
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="My places" action={<LinkButton to="/asked" variant="ghost" size="sm">Someone asked?</LinkButton>} />

      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="q" className="sr-only">Search places, dishes and notes</label>
          <input
            id="q"
            type="search"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search places, dishes, notes"
            className="min-h-11 w-full rounded-xl border border-line bg-white px-4 text-base placeholder:text-stone-500 focus-visible:border-brand-700"
          />
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`Filters${n ? `, ${n} active` : ''}`}>
          <SlidersHorizontal aria-hidden="true" className="size-5" />
          {n > 0 && <span className="rounded-full bg-brand-700 px-2 text-xs text-white">{n}</span>}
        </Button>
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {summary.map((s) => <span key={s} className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">{s}</span>)}
          <Button variant="ghost" size="sm" onClick={() => setFilters({ ...EMPTY_FILTERS, query: filters.query })}>Clear</Button>
        </div>
      )}

      <div role="group" aria-label="View" className="flex gap-2">
        <Chip pressed={view === 'list'} onClick={() => setView('list')}>List</Chip>
        <Chip pressed={view === 'map'} onClick={() => setView('map')}>Map</Chip>
        <p className="ml-auto self-center text-sm text-muted" role="status" aria-live="polite">{shown.length} place{shown.length === 1 ? '' : 's'}</p>
      </div>

      {loading ? null : entries.length === 0 ? (
        <EmptyState title="Nothing here yet">Log your first meal and it will show up here.</EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="No places match">
          <p>Try removing a filter or shortening your search.</p>
          <Button variant="secondary" className="mt-3" onClick={() => setFilters(EMPTY_FILTERS)}>Clear everything</Button>
        </EmptyState>
      ) : view === 'map' ? (
        <Suspense fallback={<p role="status">Loading map…</p>}>
          <PlaceMap entries={shown} onSelect={(id) => nav(`/visits/${id}`)} />
        </Suspense>
      ) : (
        <ul className="space-y-2">
          {shown.map((e) => (
            <li key={e.place.id}>
              <Link to={`/visits/${e.visit.id}`} className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-white p-3 hover:bg-brand-50">
                <PhotoThumb id={e.visits.flatMap((v) => v.photoIds)[0]} className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.place.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[e.place.neighborhood, priceStr(effectivePrice(e.place, e.visit)), formatDate(e.visit.visitedOn)].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <FeelingBadge feeling={e.visit.feeling} />
                    {e.visit.dishes.length > 0 && <span className="truncate text-xs text-muted">{e.visit.dishes.slice(0, 2).join(', ')}</span>}
                    {e.visits.length > 1 && <span className={cn('shrink-0 text-xs text-muted')}>{e.visits.length} visits</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FilterSheet open={open} onClose={() => setOpen(false)} filters={filters} onChange={setFilters} tags={tags} neighborhoods={hoods} count={shown.length} />
    </div>
  )
}
