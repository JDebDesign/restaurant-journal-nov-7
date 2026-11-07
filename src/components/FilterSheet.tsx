import type { Feeling, PriceLevel, Tag } from '@/data'
import { EMPTY_FILTERS, type Filters } from '@/lib/filters'
import { FEELINGS, PRICES, priceStr } from '@/lib/labels'
import { Button } from './ui/Button'
import { Chip, ChipGroup } from './ui/Chip'
import { SelectField, Switch } from './ui/fields'
import { Sheet } from './ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (f: Filters) => void
  tags: Tag[]
  neighborhoods: string[]
  count: number
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function FilterSheet({ open, onClose, filters: f, onChange, tags, neighborhoods, count }: Props) {
  return (
    <Sheet open={open} title="Filters" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-semibold">Occasion</p>
          <ChipGroup label="Occasion">
            {tags.filter((t) => t.kind === 'occasion').map((t) => (
              <Chip key={t.id} pressed={f.occasions.includes(t.id)} onClick={() => onChange({ ...f, occasions: toggle(f.occasions, t.id) })}>{t.label}</Chip>
            ))}
          </ChipGroup>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Vibe</p>
          <ChipGroup label="Vibe">
            {tags.filter((t) => t.kind === 'vibe').map((t) => (
              <Chip key={t.id} pressed={f.vibes.includes(t.id)} onClick={() => onChange({ ...f, vibes: toggle(f.vibes, t.id) })}>{t.label}</Chip>
            ))}
          </ChipGroup>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Price</p>
          <ChipGroup label="Price">
            {PRICES.map((p: PriceLevel) => (
              <Chip key={p} pressed={f.price === p} onClick={() => onChange({ ...f, price: f.price === p ? null : p })} aria-label={`${p} of 4 dollar signs`}>{priceStr(p)}</Chip>
            ))}
          </ChipGroup>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">How it went</p>
          <ChipGroup label="Feeling">
            {FEELINGS.map((x) => (
              <Chip key={x.value} pressed={f.feeling === x.value} onClick={() => onChange({ ...f, feeling: f.feeling === x.value ? null : (x.value as Feeling) })}>
                {x.emoji} {x.label}
              </Chip>
            ))}
          </ChipGroup>
        </div>
        <SelectField label="Neighborhood" value={f.neighborhood ?? ''} onChange={(e) => onChange({ ...f, neighborhood: e.target.value || null })}>
          <option value="">Anywhere</option>
          {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
        </SelectField>
        <Switch label="Recommendable only" checked={f.recommendableOnly} onChange={(v) => onChange({ ...f, recommendableOnly: v })} />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="secondary" onClick={() => onChange({ ...EMPTY_FILTERS, query: f.query })}>Clear filters</Button>
          <Button onClick={onClose}>Show {count} place{count === 1 ? '' : 's'}</Button>
        </div>
      </div>
    </Sheet>
  )
}
