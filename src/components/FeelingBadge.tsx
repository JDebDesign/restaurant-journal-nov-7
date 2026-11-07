import type { Feeling } from '@/data'
import { cn } from '@/lib/cn'
import { feelingMeta } from '@/lib/labels'

export function FeelingBadge({ feeling, className }: { feeling: Feeling | null; className?: string }) {
  const m = feelingMeta(feeling)
  if (!m) return null
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', m.badge, className)}>
      <span aria-hidden="true">{m.emoji}</span>
      {m.label}
    </span>
  )
}
