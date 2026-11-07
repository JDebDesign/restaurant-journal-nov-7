import type { SourceType } from '@/data/types'

export function detectSource(url: string): SourceType {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'other'
  }
  if (host.includes('instagram.com')) return 'instagram'
  if (host.includes('tiktok.com')) return 'tiktok'
  if (host.includes('google.') && /\/maps/.test(url)) return 'maps'
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return 'maps'
  return 'other'
}

export const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s.trim())

/** Pulls a place name out of a Google Maps /place/Name+Here/ URL to prefill the search. */
export function guessPlaceName(url: string): string {
  const m = url.match(/\/maps\/place\/([^/@?]+)/)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '))
  } catch {
    return ''
  }
}
