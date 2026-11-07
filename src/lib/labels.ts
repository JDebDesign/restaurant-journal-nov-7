import type { Feeling, PriceLevel } from '@/data/types'

export const FEELINGS: { value: Feeling; label: string; emoji: string; badge: string }[] = [
  { value: 'loved', label: 'Loved it', emoji: '😍', badge: 'bg-rose-100 text-rose-900' },
  { value: 'liked', label: 'Liked it', emoji: '🙂', badge: 'bg-amber-100 text-amber-900' },
  { value: 'meh', label: 'Meh', emoji: '😐', badge: 'bg-stone-200 text-stone-800' },
]

export const feelingMeta = (f: Feeling | null) => FEELINGS.find((x) => x.value === f) ?? null

export const PRICES: PriceLevel[] = [1, 2, 3, 4]
export const priceStr = (p: PriceLevel | null) => (p ? '$'.repeat(p) : '')

export const SOURCE_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', maps: 'Google Maps', other: 'Link' } as const
