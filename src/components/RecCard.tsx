import { Map as MapIcon, UtensilsCrossed } from 'lucide-react'
import type { RecItem } from '@/data'
import { feelingMeta, priceStr } from '@/lib/labels'
import { ExternalLink } from './ui/Button'

export function RecCard({ item, photo, index }: { item: RecItem; photo?: string | null; index?: number }) {
  const f = feelingMeta(item.feeling)
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm" aria-label={item.name}>
      {photo ? (
        <img src={photo} alt={`${item.name}`} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brand-100 to-orange-200 text-brand-700">
          <UtensilsCrossed className="size-12" />
        </div>
      )}
      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            {index !== undefined && <span className="mr-2 text-brand-700">{index + 1}.</span>}
            {item.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {[item.neighborhood, item.cuisine, priceStr(item.priceLevel)].filter(Boolean).join(' · ')}
          </p>
          {f && <p className="mt-2 text-sm font-semibold"><span aria-hidden="true">{f.emoji}</span> {f.label}</p>}
        </div>

        {item.why && (
          <section>
            <h3 className="text-xs font-bold tracking-wide text-brand-700 uppercase">Why I liked it</h3>
            <p className="mt-1 text-base">{item.why}</p>
          </section>
        )}

        {item.dishes.length > 0 && (
          <section>
            <h3 className="text-xs font-bold tracking-wide text-brand-700 uppercase">What to order</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {item.dishes.map((d) => (
                <li key={d} className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-medium text-brand-700">{d}</li>
              ))}
            </ul>
          </section>
        )}

        {item.occasions.length > 0 && (
          <p className="text-sm text-muted">Good for: {item.occasions.join(', ')}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <ExternalLink href={item.mapsUrl} className="gap-1.5 px-2 whitespace-nowrap"><MapIcon aria-hidden="true" className="size-4 shrink-0" /> Open in Maps</ExternalLink>
          <ExternalLink href={item.reserveUrl} variant="primary">Reserve</ExternalLink>
        </div>
      </div>
    </article>
  )
}
