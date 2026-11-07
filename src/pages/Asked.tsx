import { Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeelingBadge } from '@/components/FeelingBadge'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { useShareDialog } from '@/components/ShareDialog'
import { Button } from '@/components/ui/Button'
import { Chip, ChipGroup } from '@/components/ui/Chip'
import type { PriceLevel } from '@/data'
import { useEntries, useTags } from '@/hooks/data'
import { formatDate } from '@/lib/dates'
import { PRICES, priceStr } from '@/lib/labels'
import { type Constraint, type RecQuery, findRecs, suggestLoosening } from '@/lib/recs'

const MAX_SHARE = 5
const CONSTRAINT_NAME: Record<Constraint, string> = { occasion: 'occasion', price: 'price', area: 'area' }

export default function Asked() {
  const { entries, loading } = useEntries()
  const { data: tags = [] } = useTags()
  const [q, setQ] = useState<RecQuery>({})
  const [selected, setSelected] = useState<string[]>([])
  const { share, dialog, busy } = useShareDialog()

  const results = useMemo(() => findRecs(entries, q), [entries, q])
  const areas = useMemo(() => [...new Set(entries.filter((e) => e.visits.some((v) => v.recommendable)).map((e) => e.place.neighborhood))].sort(), [entries])
  const active = (Object.keys(q) as Constraint[]).filter((k) => q[k]).length
  const loosen = results.length === 0 ? suggestLoosening(entries, q) : null
  const labelFor = (k: Constraint) =>
    k === 'occasion' ? tags.find((t) => t.id === q.occasion)?.label ?? '' : k === 'price' ? priceStr(q.price ?? null) : q.area ?? ''

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_SHARE ? s : [...s, id]))

  const doShare = () => {
    const picks = results.filter((r) => selected.includes(r.place.id)).map((r) => ({ place: r.place, visit: r.visit }))
    return share(picks)
  }

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Someone asked me" back="/" />
      <p className="-mt-2 text-muted">Pick up to 3 things they care about. Best-loved and most recent come first.</p>

      <section aria-label="Constraints" className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold">Occasion</p>
          <ChipGroup label="Occasion">
            {tags.filter((t) => t.kind === 'occasion').map((t) => (
              <Chip key={t.id} pressed={q.occasion === t.id} onClick={() => setQ((p) => ({ ...p, occasion: p.occasion === t.id ? null : t.id }))}>{t.label}</Chip>
            ))}
          </ChipGroup>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Price</p>
          <ChipGroup label="Price">
            {PRICES.map((p: PriceLevel) => (
              <Chip key={p} pressed={q.price === p} onClick={() => setQ((prev) => ({ ...prev, price: prev.price === p ? null : p }))} aria-label={`${p} of 4 dollar signs`}>{priceStr(p)}</Chip>
            ))}
          </ChipGroup>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Area</p>
          <ChipGroup label="Area">
            {areas.map((a) => (
              <Chip key={a} pressed={q.area === a} onClick={() => setQ((p) => ({ ...p, area: p.area === a ? null : a }))}>{a}</Chip>
            ))}
          </ChipGroup>
        </div>
      </section>

      <section aria-labelledby="res">
        <h2 id="res" className="mb-2 text-lg font-bold" aria-live="polite">
          {active === 0 ? 'Your top picks' : `${results.length} match${results.length === 1 ? '' : 'es'}`}
        </h2>

        {loading ? null : results.length === 0 ? (
          <EmptyState title={entries.length === 0 ? 'Your journal is empty' : 'No matches for that combination'}>
            {loosen ? (
              <div className="space-y-3">
                <p>Try loosening the {CONSTRAINT_NAME[loosen.drop]}: dropping “{labelFor(loosen.drop)}” gives {loosen.count} place{loosen.count === 1 ? '' : 's'}.</p>
                <Button variant="secondary" onClick={() => setQ({ ...q, [loosen.drop]: null })}>Drop “{labelFor(loosen.drop)}”</Button>
              </div>
            ) : entries.length === 0 ? (
              <p>Log a few meals first, then come back when a friend asks.</p>
            ) : (
              <div className="space-y-3">
                <p>Try removing a filter. None of your recommendable places fit.</p>
                <Button variant="secondary" onClick={() => setQ({})}>Clear filters</Button>
              </div>
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r.place.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/visits/${r.visit.id}`} className="inline-flex min-h-11 min-w-11 items-center font-semibold underline-offset-2 hover:underline">{r.place.name}</Link>
                    <p className="text-sm text-muted">
                      {[r.place.neighborhood, priceStr(r.visit.pricePaidLevel ?? r.place.priceLevel), formatDate(r.visit.visitedOn)].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1"><FeelingBadge feeling={r.visit.feeling} /></div>
                    {r.visit.dishes.length > 0 && <p className="mt-2 text-sm"><span className="font-semibold">Order:</span> {r.visit.dishes.join(', ')}</p>}
                    {r.visit.note && <p className="mt-1 text-sm text-muted">{r.visit.note}</p>}
                  </div>
                  <Chip
                    pressed={selected.includes(r.place.id)}
                    onClick={() => toggle(r.place.id)}
                    aria-label={`Add ${r.place.name} to share card`}
                    className="shrink-0"
                  >
                    {selected.includes(r.place.id) ? 'Added' : 'Add'}
                  </Chip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-2">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-lg">
            <p className="flex-1 pl-2 text-sm font-semibold">{selected.length} of {MAX_SHARE} selected</p>
            <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            <Button onClick={doShare} disabled={busy}><Share2 aria-hidden="true" className="size-4" /> Share</Button>
          </div>
        </div>
      )}
      {dialog}
    </div>
  )
}
