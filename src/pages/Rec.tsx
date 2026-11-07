import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { RecCard } from '@/components/RecCard'
import { LinkButton } from '@/components/ui/Button'
import { journal } from '@/data'
import type { RecPayload, Share } from '@/data'
import { readPayloadFromHash } from '@/lib/share'

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'property') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.content = content
}

/**
 * Public rec card. Content comes from the URL hash (works on any device, no backend) or, on the
 * sharer's own browser, from the local share record. Backend step: render server-side from the
 * `shares` tables and emit real OG tags + an og:image.
 */
export default function Rec() {
  const { slug = '' } = useParams()
  const { hash } = useLocation()
  const [share, setShare] = useState<Share | null | undefined>(undefined)

  useEffect(() => {
    journal.getShareBySlug(slug).then((s) => {
      setShare(s)
      if (s) void journal.recordShareView(slug)
    })
  }, [slug])

  const payload: RecPayload | null = useMemo(() => readPayloadFromHash(hash) ?? share?.payload ?? null, [hash, share])

  useEffect(() => {
    if (!payload) return
    const title = payload.items.length === 1 ? `${payload.items[0].name}: a rec` : payload.title
    const desc =
      payload.items.length === 1
        ? [payload.items[0].why, payload.items[0].dishes.length ? `Order: ${payload.items[0].dishes.join(', ')}` : ''].filter(Boolean).join(' ')
        : payload.items.map((i) => i.name).join(', ')
    document.title = `${title} | Recd`
    setMeta('og:title', title)
    setMeta('og:description', desc || 'A restaurant rec from a friend.')
    setMeta('og:type', 'website')
    setMeta('og:url', window.location.href)
    setMeta('twitter:card', 'summary_large_image', 'name')
    setMeta('description', desc || 'A restaurant rec from a friend.', 'name')
  }, [payload])

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      {share === undefined && !payload ? (
        <p role="status">Loading…</p>
      ) : !payload ? (
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold">This rec link is incomplete</h1>
          <p className="mt-2 text-muted">Ask your friend to send it again.</p>
          <LinkButton to="/" className="mt-6">Go to Recd</LinkButton>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold tracking-wide text-brand-700 uppercase">
            {payload.items.length > 1 ? 'A friend’s recs for you' : 'A friend’s rec for you'}
          </p>
          {payload.items.length > 1 && <h1 className="mb-4 text-3xl font-bold">{payload.title}</h1>}
          <div className="space-y-5">
            {payload.items.map((item, i) => (
              <div key={item.name + i}>
                {payload.items.length === 1 && <h1 className="sr-only">{item.name}</h1>}
                <RecCard item={item} photo={share?.thumbs?.[i] ?? null} index={payload.items.length > 1 ? i : undefined} />
              </div>
            ))}
          </div>
          <footer className="mt-8 rounded-2xl bg-brand-100 p-5 text-center">
            <p className="font-semibold">Remember every spot you eat.</p>
            <LinkButton to="/sign-in" className="mt-3">Keep your own list</LinkButton>
            <p className="mt-3 text-xs text-muted"><Link to="/" className="underline">Recd</Link></p>
          </footer>
        </>
      )}
    </main>
  )
}
