import { Link } from 'react-router-dom'
import type { Place, Visit } from '@/data'
import { formatDate } from '@/lib/dates'
import { priceStr } from '@/lib/labels'
import { FeelingBadge } from './FeelingBadge'
import { PhotoThumb } from './PhotoThumb'

export function VisitCard({ visit, place }: { visit: Visit; place: Place }) {
  return (
    <Link
      to={`/visits/${visit.id}`}
      className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-white p-3 hover:bg-brand-50"
    >
      <PhotoThumb id={visit.photoIds[0]} className="size-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{place.name}</p>
        <p className="truncate text-sm text-muted">
          {[place.neighborhood, priceStr(visit.pricePaidLevel ?? place.priceLevel), formatDate(visit.visitedOn)].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <FeelingBadge feeling={visit.feeling} />
          {visit.dishes.length > 0 && <span className="truncate text-xs text-muted">{visit.dishes.slice(0, 2).join(', ')}</span>}
        </div>
      </div>
    </Link>
  )
}
