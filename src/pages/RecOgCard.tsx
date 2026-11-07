import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { journal } from '@/data'
import type { RecPayload } from '@/data'
import { priceStr } from '@/lib/labels'
import { readPayloadFromHash } from '@/lib/share'

/**
 * The 1200x630 social-preview layout. Rendered here as plain HTML so a backend step can screenshot it
 * (or port it to @vercel/og / a Supabase edge function) to produce the real og:image.
 */
export default function RecOgCard() {
  const { slug = '' } = useParams()
  const { hash } = useLocation()
  const [payload, setPayload] = useState<RecPayload | null>(readPayloadFromHash(hash))
  const wrap = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!payload) journal.getShareBySlug(slug).then((s) => setPayload(s?.payload ?? null))
  }, [slug, payload])

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (wrap.current?.clientWidth ?? 1200) / 1200))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const first = payload?.items[0]
  return (
    <main className="min-h-dvh bg-stone-200 p-0">
      <h1 className="sr-only">Social preview card</h1>
      <div ref={wrap} className="w-full overflow-hidden" style={{ height: 630 * scale }}>
        <div
          id="og-card"
          style={{ width: 1200, height: 630, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="flex flex-col justify-between bg-gradient-to-br from-orange-700 to-amber-500 p-16 text-white"
        >
          <p className="text-3xl font-bold tracking-wide uppercase opacity-90">Recd · a friend’s rec</p>
          <div>
            <p className="text-7xl leading-tight font-extrabold">{payload && payload.items.length > 1 ? payload.title : first?.name ?? 'Rec'}</p>
            <p className="mt-4 text-4xl opacity-95">
              {payload && payload.items.length > 1
                ? payload.items.map((i) => i.name).join(' · ')
                : [first?.neighborhood, first?.cuisine, priceStr(first?.priceLevel ?? null)].filter(Boolean).join(' · ')}
            </p>
          </div>
          <p className="text-3xl opacity-95">{first?.dishes.length ? `Order: ${first.dishes.slice(0, 3).join(', ')}` : ''}</p>
        </div>
      </div>
    </main>
  )
}
