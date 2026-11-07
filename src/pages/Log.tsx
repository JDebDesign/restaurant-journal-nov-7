import { Camera, MapPinOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PhotoThumb } from '@/components/PhotoThumb'
import { PlaceRow, PlaceSearch } from '@/components/PlaceSearch'
import { VisitForm } from '@/components/VisitForm'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { photos, places } from '@/data'
import type { Place, Visit } from '@/data'
import { useCreateVisit, usePlace, useVisit } from '@/hooks/data'
import { readPhotoInfo, summarize } from '@/lib/exif'
import { downscale } from '@/lib/image'
import { toISODate } from '@/lib/dates'
import { useQueryClient } from '@tanstack/react-query'

const MAX_PHOTOS = 5

interface Picked {
  photoIds: string[]
  date: string | null
  suggestions: Place[] | null // null = no GPS
}

export default function Log() {
  const nav = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const create = useCreateVisit()
  const [picked, setPicked] = useState<Picked | null>(null)
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const input = useRef<HTMLInputElement>(null)

  // Nudge entry: reuse photos that were uploaded but never attached.
  useEffect(() => {
    if (!params.get('pending')) return
    ;(async () => {
      const cutoff = Date.now() - 7 * 86400000
      const pend = (await photos.list()).filter((p) => p.visitId === null && new Date(p.takenAt ?? p.createdAt).getTime() >= cutoff).slice(0, MAX_PHOTOS)
      if (pend.length === 0) return
      const hit = pend.find((p) => p.lat !== null && p.lng !== null)
      const first = pend.find((p) => p.takenAt)
      setPicked({
        photoIds: pend.map((p) => p.id),
        date: first?.takenAt ? toISODate(new Date(first.takenAt)) : null,
        suggestions: hit ? await places.nearby(hit.lat!, hit.lng!, 3) : null,
      })
    })()
  }, [params])

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files).slice(0, MAX_PHOTOS)
    if (files.length > MAX_PHOTOS) setNote(`Using the first ${MAX_PHOTOS} photos.`)
    else setNote('')
    setBusy(true)
    try {
      const infos = await Promise.all(list.map((f) => readPhotoInfo(f))) // read EXIF before downscaling strips it
      const metas = await Promise.all(
        list.map(async (f, i) =>
          photos.add(await downscale(f), { takenAt: infos[i].takenAt, lat: infos[i].lat, lng: infos[i].lng }),
        ),
      )
      const coords = summarize(infos)
      setPicked({
        photoIds: metas.map((m) => m.id),
        date: infos.find((i) => i.date)?.date ?? null,
        suggestions: coords ? await places.nearby(coords.lat, coords.lng, 3) : null,
      })
      setSearching(false)
      await qc.invalidateQueries({ queryKey: ['j'] })
    } catch {
      toast('Could not read that photo. You can search for the place instead.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const pick = async (place: Place) => {
    const v = await create.mutateAsync({ placeId: place.id, visitedOn: picked?.date ?? undefined, photoIds: picked?.photoIds })
    setVisitId(v.id)
  }

  const showSearch = !picked || searching || picked.suggestions === null || picked.suggestions.length === 0

  return (
    <div className="space-y-5">
      <PageHeader title="Log a meal" back="/" />

      {!picked && (
        <>
          <label className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-brand-700 px-6 text-lg font-semibold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-700 hover:bg-orange-800">
            <Camera aria-hidden="true" className="size-6" />
            {busy ? 'Reading photos…' : 'Add photo'}
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
              aria-label="Add photo (1 to 5)"
            />
          </label>
          <p className="-mt-2 text-center text-sm text-muted">We’ll use the photo’s location and date to find the restaurant.</p>
          {note && <p className="text-sm text-muted" role="status">{note}</p>}
          <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {picked && (
        <section aria-label="Your photos" className="space-y-3">
          <ul className="flex gap-2 overflow-x-auto">
            {picked.photoIds.map((id) => (
              <li key={id}><PhotoThumb id={id} className="size-20 rounded-xl" alt="Selected photo" /></li>
            ))}
          </ul>
          {note && <p className="text-sm text-muted" role="status">{note}</p>}
          {picked.suggestions && picked.suggestions.length > 0 ? (
            <div>
              <h2 className="mb-2 text-lg font-bold">Is this where you ate?</h2>
              <ul className="space-y-2">
                {picked.suggestions.map((p) => (
                  <li key={p.id}><PlaceRow place={p} onPick={pick} /></li>
                ))}
              </ul>
              {!searching && (
                <Button variant="ghost" className="mt-2" onClick={() => setSearching(true)}>Not here? Search instead</Button>
              )}
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-muted" role="status">
              <MapPinOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {picked.suggestions === null
                ? 'No location found in this photo (iPhones often remove it). Search for the place below.'
                : 'No restaurants found near where this was taken. Search for the place below.'}
            </p>
          )}
        </section>
      )}

      {showSearch && (
        <PlaceSearch onPick={pick} label="Search a place" placeholder="Restaurant name" autoFocus={!!picked} />
      )}

      <Sheet open={!!visitId} title="Saved. Add details?" onClose={() => finish()}>
        {visitId && <LogDetails id={visitId} onDone={finish} />}
      </Sheet>
    </div>
  )

  function finish() {
    setVisitId(null)
    toast('Logged. You can add more any time.')
    nav('/')
  }
}

function LogDetails({ id, onDone }: { id: string; onDone: () => void }) {
  const { data: visit } = useVisit(id)
  const { data: place } = usePlace(visit?.placeId)
  if (!visit || !place) return null
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">This visit is already in your journal. Everything below saves as you go.</p>
      <VisitForm visit={visit as Visit} place={place} />
      <Button block size="lg" onClick={onDone}>Done</Button>
    </div>
  )
}
