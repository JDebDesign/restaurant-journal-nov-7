import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place, PriceLevel, Visit, VisitPatch } from '@/data'
import { useTags, useUpdateVisit } from '@/hooks/data'
import { cn } from '@/lib/cn'
import { todayISO } from '@/lib/dates'
import { FEELINGS, PRICES, priceStr } from '@/lib/labels'
import { Button } from './ui/Button'
import { Chip, ChipGroup } from './ui/Chip'
import { Switch, TextArea, TextField } from './ui/fields'

/** Every edit is saved automatically; text fields are debounced, taps save immediately. */
export function VisitForm({ visit, place }: { visit: Visit; place: Place }) {
  const { data: tags = [] } = useTags()
  const update = useUpdateVisit()
  const [draft, setDraft] = useState(visit)
  const [dishInput, setDishInput] = useState('')
  const [saved, setSaved] = useState(false)
  const pending = useRef<VisitPatch>({})
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const patch = pending.current
    if (Object.keys(patch).length === 0) return
    pending.current = {}
    update.mutate({ id: visit.id, patch }, { onSuccess: () => setSaved(true) })
  }, [update, visit.id])

  // Save any debounced edit when leaving the screen.
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => flushRef.current(), [])

  const change = (patch: VisitPatch, debounce = false) => {
    setDraft((d) => ({ ...d, ...patch }))
    setSaved(false)
    pending.current = { ...pending.current, ...patch }
    clearTimeout(timer.current)
    if (debounce) timer.current = setTimeout(flush, 500)
    else flush()
  }

  const toggleTag = (id: string) =>
    change({ tagIds: draft.tagIds.includes(id) ? draft.tagIds.filter((t) => t !== id) : [...draft.tagIds, id] })

  const addDish = () => {
    const name = dishInput.trim()
    if (!name || draft.dishes.some((d) => d.toLowerCase() === name.toLowerCase())) return setDishInput('')
    change({ dishes: [...draft.dishes, name] })
    setDishInput('')
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); addDish() }}>
      <div>
        <p className="text-xl font-bold">{place.name}</p>
        <p className="text-sm text-muted">{[place.neighborhood, place.cuisine, priceStr(place.priceLevel)].filter(Boolean).join(' · ')}</p>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">How was it?</legend>
        <div className="grid grid-cols-3 gap-2">
          {FEELINGS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={draft.feeling === f.value}
              onClick={() => change({ feeling: draft.feeling === f.value ? null : f.value, recommendable: draft.feeling === f.value ? draft.recommendable : f.value !== 'meh' })}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center rounded-xl border text-sm font-semibold',
                draft.feeling === f.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white hover:bg-brand-50',
              )}
            >
              <span aria-hidden="true" className="text-2xl leading-none">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="dish" className="mb-1 block text-sm font-semibold">What to order</label>
        <div className="flex gap-2">
          <input
            id="dish"
            value={dishInput}
            onChange={(e) => setDishInput(e.target.value)}
            placeholder="A standout dish"
            enterKeyHint="done"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-base placeholder:text-stone-500 focus-visible:border-brand-700"
          />
          <Button type="submit" variant="secondary">Add</Button>
        </div>
        {draft.dishes.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Standout dishes">
            {draft.dishes.map((d) => (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => change({ dishes: draft.dishes.filter((x) => x !== d) })}
                  aria-label={`Remove ${d}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-100 px-4 text-sm font-medium text-brand-700"
                >
                  {d}
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">Good for</p>
        <ChipGroup label="Occasion">
          {tags.filter((t) => t.kind === 'occasion').map((t) => (
            <Chip key={t.id} pressed={draft.tagIds.includes(t.id)} onClick={() => toggleTag(t.id)}>{t.label}</Chip>
          ))}
        </ChipGroup>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">Vibe</p>
        <ChipGroup label="Vibe">
          {tags.filter((t) => t.kind === 'vibe').map((t) => (
            <Chip key={t.id} pressed={draft.tagIds.includes(t.id)} onClick={() => toggleTag(t.id)}>{t.label}</Chip>
          ))}
        </ChipGroup>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">Price</p>
        <ChipGroup label="Price level">
          {PRICES.map((p: PriceLevel) => (
            <Chip key={p} pressed={draft.pricePaidLevel === p} onClick={() => change({ pricePaidLevel: draft.pricePaidLevel === p ? null : p })} aria-label={`${p} of 4 dollar signs`}>
              {priceStr(p)}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <TextArea
        label="Short note"
        value={draft.note}
        onChange={(e) => change({ note: e.target.value }, true)}
        onBlur={flush}
        placeholder="Why would you send a friend here?"
        maxLength={400}
      />

      <TextField
        label="Visit date"
        type="date"
        value={draft.visitedOn}
        max={todayISO()}
        onChange={(e) => e.target.value && change({ visitedOn: e.target.value })}
      />

      <Switch label="I'd recommend it" checked={draft.recommendable} onChange={(v) => change({ recommendable: v })} />

      <p className="flex min-h-6 items-center gap-1 text-sm text-muted" role="status" aria-live="polite">
        {saved && (<><Check aria-hidden="true" className="size-4 text-green-700" /> Saved</>)}
      </p>
    </form>
  )
}
