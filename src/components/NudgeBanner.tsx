import { Camera } from 'lucide-react'
import { useUnattachedPhotos } from '@/hooks/data'
import { LinkButton } from './ui/Button'

/** Photos that were picked but never attached to a visit, from the last 7 days. */
export function NudgeBanner() {
  const { data = [] } = useUnattachedPhotos()
  const cutoff = Date.now() - 7 * 86400000
  const recent = data.filter((p) => new Date(p.takenAt ?? p.createdAt).getTime() >= cutoff)
  if (recent.length === 0) return null
  return (
    <section aria-label="Photos to log" className="flex items-center gap-3 rounded-2xl border border-brand-500/40 bg-brand-100 p-4">
      <Camera aria-hidden="true" className="size-6 shrink-0 text-brand-700" />
      <p className="flex-1 text-sm font-medium">
        You have {recent.length} photo{recent.length === 1 ? '' : 's'} from restaurants this week. Log {recent.length === 1 ? 'it' : 'them'}?
      </p>
      <LinkButton to="/log?pending=1" size="sm">Log</LinkButton>
    </section>
  )
}
