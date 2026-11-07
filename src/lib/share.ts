import type { Place, RecItem, RecPayload, Tag, Visit } from '@/data/types'

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodePayload(p: RecPayload): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(p)))
}

export function decodePayload(s: string): RecPayload | null {
  try {
    const p = JSON.parse(new TextDecoder().decode(fromBase64Url(s)))
    if (p?.v === 1 && Array.isArray(p.items) && typeof p.title === 'string') return p as RecPayload
  } catch {
    /* invalid */
  }
  return null
}

export const reserveUrl = (place: Place) =>
  place.website ?? `https://www.google.com/search?q=${encodeURIComponent(`${place.name} ${place.neighborhood} Atlanta reservations`)}`

export function toRecItem(place: Place, visit: Visit | null, tags: Tag[]): RecItem {
  return {
    name: place.name,
    neighborhood: place.neighborhood,
    priceLevel: visit?.pricePaidLevel ?? place.priceLevel,
    cuisine: place.cuisine,
    why: visit?.note ?? '',
    dishes: visit?.dishes ?? [],
    occasions: (visit?.tagIds ?? []).map((id) => tags.find((t) => t.id === id)).filter((t) => t?.kind === 'occasion').map((t) => t!.label),
    feeling: visit?.feeling ?? null,
    mapsUrl: place.googleMapsUrl,
    reserveUrl: reserveUrl(place),
  }
}

/** Full public URL. The payload rides in the hash so no backend is needed to render it. */
export function shareUrl(origin: string, slug: string, payload: RecPayload): string {
  return `${origin}/r/${slug}#d=${encodePayload(payload)}`
}

export function readPayloadFromHash(hash: string): RecPayload | null {
  const m = hash.match(/[#&]d=([A-Za-z0-9_-]+)/)
  return m ? decodePayload(m[1]) : null
}
