import { ExternalLink as ExtIcon, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PlaceSearch } from '@/components/PlaceSearch'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/fields'
import { useToast } from '@/components/ui/Toast'
import type { Place, SourceType } from '@/data'
import { useAddWant, useConvertWant, usePlaces, useRemoveWant, useWant } from '@/hooks/data'
import { priceStr, SOURCE_LABEL } from '@/lib/labels'
import { detectSource, guessPlaceName, looksLikeUrl } from '@/lib/source'

export default function Want() {
  const nav = useNavigate()
  const toast = useToast()
  const { data: all = [] } = useWant()
  const open = all.filter((w) => !w.convertedVisitId)
  const { data: places = [] } = usePlaces(open.map((w) => w.placeId))
  const add = useAddWant()
  const remove = useRemoveWant()
  const convert = useConvertWant()
  const [link, setLink] = useState('')
  const [pending, setPending] = useState<{ url: string; type: SourceType } | null>(null)
  const [adding, setAdding] = useState(false)

  const onLink = (e: React.FormEvent) => {
    e.preventDefault()
    const url = link.trim()
    if (!looksLikeUrl(url)) return toast('Paste a link that starts with http')
    setPending({ url, type: detectSource(url) })
    setLink('')
  }

  const save = async (place: Place) => {
    await add.mutateAsync({ placeId: place.id, sourceUrl: pending?.url ?? null, sourceType: pending?.type ?? null })
    toast(`Saved ${place.name}`)
    setPending(null)
    setAdding(false)
  }

  const logIt = async (id: string) => {
    const v = await convert.mutateAsync(id)
    toast('Moved to your journal')
    nav(`/visits/${v.id}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Want to try" />

      <section aria-label="Add a place" className="space-y-3 rounded-2xl border border-line bg-white p-4">
        {pending ? (
          <>
            <p className="text-sm">
              Saved a <strong>{SOURCE_LABEL[pending.type]}</strong> link. Which place is it?
            </p>
            <PlaceSearch onPick={save} label="Pick the place" initialQuery={guessPlaceName(pending.url)} autoFocus />
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          </>
        ) : adding ? (
          <>
            <PlaceSearch onPick={save} label="Search a place" autoFocus />
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <form onSubmit={onLink} className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="Paste an Instagram, TikTok or Maps link" type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
              </div>
              <Button type="submit" variant="secondary">Add</Button>
            </form>
            <Button variant="ghost" onClick={() => setAdding(true)}>Or search for a place</Button>
          </>
        )}
      </section>

      <section aria-labelledby="list-h">
        <h2 id="list-h" className="mb-2 text-lg font-bold">Your list ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState title="Nothing saved yet">Paste a post you saved or search for a place you keep hearing about.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {open.map((w) => {
              const p = places.find((x) => x.id === w.placeId)
              if (!p) return null
              return (
                <li key={w.id} className="rounded-2xl border border-line bg-white p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">{[p.neighborhood, p.cuisine, priceStr(p.priceLevel)].filter(Boolean).join(' · ')}</p>
                  {w.note && <p className="mt-1 text-sm">{w.note}</p>}
                  {w.sourceUrl && (
                    <a href={w.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700 underline">
                      {SOURCE_LABEL[w.sourceType ?? 'other']} post <ExtIcon aria-hidden="true" className="size-3.5" />
                    </a>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button className="flex-1" onClick={() => logIt(w.id)} aria-label={`I went to ${p.name}`}>I went! Log it</Button>
                    <Button variant="secondary" onClick={() => remove.mutate(w.id)} aria-label={`Remove ${p.name}`}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
