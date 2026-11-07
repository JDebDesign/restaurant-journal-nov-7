import { Camera, Share2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PhotoThumb } from '@/components/PhotoThumb'
import { useShareDialog } from '@/components/ShareDialog'
import { VisitForm } from '@/components/VisitForm'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { photos } from '@/data'
import { useAttachPhotos, useDeleteVisit, usePlace, useRemovePhoto, useVisit } from '@/hooks/data'
import { readPhotoInfo } from '@/lib/exif'
import { downscale } from '@/lib/image'

export default function VisitDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: visit, isPending } = useVisit(id)
  const { data: place } = usePlace(visit?.placeId)
  const del = useDeleteVisit()
  const attach = useAttachPhotos()
  const removePhoto = useRemovePhoto()
  const { share, dialog, busy } = useShareDialog()
  const [confirm, setConfirm] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  if (isPending) return <p role="status">Loading…</p>
  if (!visit) return <Navigate to="/" replace />
  if (!place) return <p role="status">Loading…</p>

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    const room = 5 - visit.photoIds.length
    const list = Array.from(files).slice(0, Math.max(room, 0))
    for (const f of list) {
      const info = await readPhotoInfo(f)
      const m = await photos.add(await downscale(f), { takenAt: info.takenAt, lat: info.lat, lng: info.lng })
      await attach.mutateAsync({ photoIds: [m.id], visitId: visit.id })
    }
    if (file.current) file.current.value = ''
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Visit" back="/places" />

      <section aria-label="Photos">
        {visit.photoIds.length > 0 && (
          <ul className="mb-3 flex gap-2 overflow-x-auto">
            {visit.photoIds.map((pid) => (
              <li key={pid} className="relative shrink-0">
                <PhotoThumb id={pid} className="size-28 rounded-xl" alt={`Photo from ${place.name}`} />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => removePhoto.mutate(pid)}
                  className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {visit.photoIds.length < 5 && (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold hover:bg-brand-50 focus-within:outline-2 focus-within:outline-brand-700">
            <Camera aria-hidden="true" className="size-4" /> Add photos
            <input ref={file} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
          </label>
        )}
      </section>

      <VisitForm key={visit.id} visit={visit} place={place} />

      <div className="space-y-2 border-t border-line pt-4">
        <Button block size="lg" onClick={() => share([{ place, visit }])} disabled={busy}>
          <Share2 aria-hidden="true" className="size-5" /> Share rec
        </Button>
        {confirm ? (
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={async () => { await del.mutateAsync(visit.id); toast('Visit deleted'); nav('/places') }}>
              Yes, delete this visit
            </Button>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" block onClick={() => setConfirm(true)}>Delete visit</Button>
        )}
      </div>
      {dialog}
    </div>
  )
}
