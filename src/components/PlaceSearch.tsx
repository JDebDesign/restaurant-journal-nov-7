import { MapPin, Search } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { places } from '@/data'
import type { Place } from '@/data'
import { priceStr } from '@/lib/labels'

interface Props {
  onPick: (place: Place) => void
  label?: string
  placeholder?: string
  initialQuery?: string
  autoFocus?: boolean
}

export function PlaceRow({ place, onPick }: { place: Place; onPick: (p: Place) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(place)}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-2 text-left hover:bg-brand-50"
    >
      <MapPin aria-hidden="true" className="size-5 shrink-0 text-brand-700" />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{place.name}</span>
        <span className="block truncate text-sm text-muted">
          {[place.cuisine, place.neighborhood, priceStr(place.priceLevel)].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  )
}

export function PlaceSearch({ onPick, label = 'Search a place', placeholder = 'Restaurant name', initialQuery = '', autoFocus }: Props) {
  const id = useId()
  const [q, setQ] = useState(initialQuery)
  const [results, setResults] = useState<Place[]>([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    let live = true
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    places.search(q).then((r) => {
      if (live) {
        setResults(r)
        setSearched(true)
      }
    })
    return () => {
      live = false
    }
  }, [q])

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-500" />
        <input
          id={id}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-12 w-full rounded-xl border border-line bg-white pr-4 pl-10 text-base placeholder:text-stone-500 focus-visible:border-brand-700"
        />
      </div>
      <ul className="mt-2 space-y-2" aria-label="Matching places">
        {results.map((p) => (
          <li key={p.id}>
            <PlaceRow place={p} onPick={onPick} />
          </li>
        ))}
      </ul>
      {searched && results.length === 0 && (
        <p className="mt-3 text-sm text-muted" role="status">No places match “{q}”. Try a shorter name or a cuisine.</p>
      )}
    </div>
  )
}
