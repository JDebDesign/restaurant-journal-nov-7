import { Check, Copy, Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { backend, journal, photos } from '@/data'
import type { Place, Visit } from '@/data'
import { downscale } from '@/lib/image'
import { shareUrl, toRecItem } from '@/lib/share'
import { Button, ExternalLink } from './ui/Button'
import { Sheet } from './ui/Sheet'
import { useToast } from './ui/Toast'

export interface ShareInput {
  place: Place
  visit: Visit | null
}

async function thumbFor(visit: Visit | null): Promise<string | null> {
  const id = visit?.photoIds[0]
  if (!id) return null
  try {
    const url = await photos.getUrl(id)
    if (!url) return null
    const small = await downscale(await (await fetch(url)).blob(), 480, 0.7)
    return await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(small)
    })
  } catch {
    return null
  }
}

/** Creates a public rec link for 1-5 places and shows it in a sheet. */
export function useShareDialog() {
  const toast = useToast()
  const [state, setState] = useState<{ url: string; title: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const share = useCallback(
    async (items: ShareInput[], title?: string) => {
      if (items.length === 0 || busy) return
      setBusy(true)
      try {
        const tags = await journal.listTags()
        const t = title ?? (items.length === 1 ? items[0].place.name : "Places I'd send you to")
        const payload = { v: 1 as const, title: t, items: items.slice(0, 5).map((i) => toRecItem(i.place, i.visit, tags)) }
        const thumbs = await Promise.all(items.slice(0, 5).map((i) => thumbFor(i.visit)))
        const s = await journal.createShare({
          title: t,
          items: items.slice(0, 5).map((i) => ({ placeId: i.place.id, visitId: i.visit?.id ?? null })),
          payload,
          thumbs,
        })
        setCopied(false)
        // With a database the link is just the slug; in local mode the card travels in the URL hash.
        setState({ url: backend === 'supabase' ? `${window.location.origin}/r/${s.slug}` : shareUrl(window.location.origin, s.slug, payload), title: t })
      } catch {
        toast('Could not create the link. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [busy, toast],
  )

  const copy = async () => {
    if (!state) return
    try {
      await navigator.clipboard.writeText(state.url)
      setCopied(true)
      toast('Link copied')
    } catch {
      toast('Copy failed. Press and hold the link to copy it.')
    }
  }

  const nativeShare = async () => {
    if (!state) return
    try {
      await navigator.share({ title: state.title, text: `${state.title} on Recd`, url: state.url })
    } catch {
      /* user cancelled */
    }
  }

  const dialog = (
    <Sheet open={!!state} title="Share this rec" onClose={() => setState(null)}>
      {state && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Anyone with this link can view it. No account needed.</p>
          <input
            readOnly
            aria-label="Share link"
            value={state.url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full truncate rounded-xl border border-line bg-white px-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copy}>
              {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Button variant="secondary" onClick={nativeShare}><Share2 aria-hidden="true" className="size-4" /> Share…</Button>
            ) : (
              <ExternalLink href={state.url} target="_self">Preview</ExternalLink>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )

  return { share, dialog, busy }
}
