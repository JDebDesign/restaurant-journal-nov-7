import { shortSlug } from '../local/db'
import { buildDemoData } from '../fixtures/seed'
import type { JournalRepo } from '../services'
import type {
  Feeling, PhotoMeta, PriceLevel, RecPayload, Share, SourceType, Tag, TagKind, Visit, VisitPatch, WantToTry,
} from '../types'
import { toRecItem } from '@/lib/share'
import { PHOTO_BUCKET, requireUserId, supabase, unwrap } from './client'
import { allPlaces } from './places'

// ---- row mappers -----------------------------------------------------------------------------

interface VisitRow {
  id: string
  place_id: string
  visited_on: string
  feeling: Feeling | null
  note: string
  recommendable: boolean
  price_paid_level: number | null
  created_at: string
  updated_at: string
  visit_dishes: { name: string; position: number }[]
  visit_tags: { tag_id: string }[]
  visit_photos: { id: string; created_at: string }[]
}

const VISIT_SELECT = '*, visit_dishes(name, position), visit_tags(tag_id), visit_photos(id, created_at)'

const toVisit = (r: VisitRow): Visit => ({
  id: r.id,
  placeId: r.place_id,
  visitedOn: r.visited_on,
  feeling: r.feeling,
  note: r.note,
  recommendable: r.recommendable,
  pricePaidLevel: (r.price_paid_level as PriceLevel | null) ?? null,
  dishes: [...r.visit_dishes].sort((a, b) => a.position - b.position).map((d) => d.name),
  tagIds: r.visit_tags.map((t) => t.tag_id),
  photoIds: [...r.visit_photos].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p) => p.id),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

interface WantRow {
  id: string
  place_id: string
  source_url: string | null
  source_type: SourceType | null
  note: string
  created_at: string
  converted_visit_id: string | null
}

const toWant = (r: WantRow): WantToTry => ({
  id: r.id, placeId: r.place_id, sourceUrl: r.source_url, sourceType: r.source_type, note: r.note,
  createdAt: r.created_at, convertedVisitId: r.converted_visit_id,
})

interface ShareRow {
  id: string
  slug: string
  title: string
  created_at: string
  view_count: number
  payload: RecPayload
  share_items: { place_id: string; visit_id: string | null; position: number }[]
}

const toShare = (r: ShareRow): Share => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  createdAt: r.created_at,
  viewCount: r.view_count,
  payload: r.payload,
  items: [...r.share_items].sort((a, b) => a.position - b.position).map((i) => ({ placeId: i.place_id, visitId: i.visit_id })),
})

const patchToRpc = (p: VisitPatch) => ({
  ...('visitedOn' in p && { visited_on: p.visitedOn }),
  ...('feeling' in p && { feeling: p.feeling }),
  ...('note' in p && { note: p.note }),
  ...('recommendable' in p && { recommendable: p.recommendable }),
  ...('pricePaidLevel' in p && { price_paid_level: p.pricePaidLevel }),
  ...('dishes' in p && { dishes: p.dishes }),
  ...('tagIds' in p && { tag_ids: p.tagIds }),
})

// ---- repo ------------------------------------------------------------------------------------

async function getVisit(id: string): Promise<Visit | null> {
  const res = await supabase.from('visits').select(VISIT_SELECT).eq('id', id).maybeSingle()
  const row = unwrap(res)
  return row ? toVisit(row as unknown as VisitRow) : null
}

// Autosave can fire several updates in quick succession; apply them in order per visit.
const queues = new Map<string, Promise<unknown>>()

async function updateVisit(id: string, patch: VisitPatch): Promise<Visit> {
  const run = async () => {
    const rpc = await supabase.rpc('update_visit', { p_id: id, p_patch: patchToRpc(patch) })
    if (rpc.error) throw new Error(rpc.error.message)
    const v = await getVisit(id)
    if (!v) throw new Error('Visit not found')
    return v
  }
  const next = (queues.get(id) ?? Promise.resolve()).then(run, run)
  queues.set(id, next.catch(() => undefined))
  return next
}

async function listVisits(): Promise<Visit[]> {
  const res = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .order('visited_on', { ascending: false })
    .order('created_at', { ascending: false })
  return unwrap(res).map((r) => toVisit(r as unknown as VisitRow))
}

async function listTags(): Promise<Tag[]> {
  const res = await supabase.from('tags').select('id, kind, label')
  const order = ['date-night', 'groups', 'solo', 'family', 'impress-visitors', 'brunch', 'late-night', 'quick-bite', 'cozy', 'lively', 'outdoor']
  return unwrap(res)
    .map((t) => ({ id: t.id as string, kind: t.kind as TagKind, label: t.label as string }))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}

async function createShare(input: Parameters<JournalRepo['createShare']>[0]): Promise<Share> {
  // photo_paths[i] = storage path of item i's first photo ('' when none). Photos become readable
  // by anyone holding the link (see is_shared_photo in the database).
  const photoPaths = await Promise.all(
    input.items.map(async (it) => {
      if (!it.visitId) return ''
      const res = await supabase.from('visit_photos').select('storage_path').eq('visit_id', it.visitId).order('created_at').limit(1)
      return (res.data?.[0]?.storage_path as string | undefined) ?? ''
    }),
  )
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = shortSlug(8)
    const ins = await supabase
      .from('shares')
      .insert({ slug, title: input.title, payload: input.payload, photo_paths: photoPaths })
      .select('id')
      .single()
    if (ins.error) {
      if (ins.error.code === '23505') continue // slug collision, try another
      throw new Error(ins.error.message)
    }
    const items = input.items.slice(0, 5).map((it, position) => ({ share_id: ins.data.id, place_id: it.placeId, visit_id: it.visitId, position }))
    const itemsRes = await supabase.from('share_items').insert(items)
    if (itemsRes.error) {
      await supabase.from('shares').delete().eq('id', ins.data.id)
      throw new Error(itemsRes.error.message)
    }
    return {
      id: ins.data.id, slug, title: input.title, createdAt: new Date().toISOString(), viewCount: 0,
      items: input.items, payload: input.payload,
    }
  }
  throw new Error('Could not allocate a share link')
}

export const supabaseJournal: JournalRepo = {
  listTags,
  listVisits,
  getVisit,

  async createVisit({ placeId, visitedOn, photoIds }) {
    const res = await supabase
      .from('visits')
      .insert({ place_id: placeId, ...(visitedOn && { visited_on: visitedOn }) })
      .select('id')
      .single()
    const { id } = unwrap(res)
    if (photoIds?.length) {
      const att = await supabase.from('visit_photos').update({ visit_id: id }).in('id', photoIds)
      if (att.error) throw new Error(att.error.message)
    }
    const v = await getVisit(id)
    if (!v) throw new Error('Visit not found after create')
    return v
  },
  updateVisit,
  async deleteVisit(id) {
    const res = await supabase.from('visits').delete().eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },

  async listWant() {
    const res = await supabase.from('want_to_try').select('*').order('created_at', { ascending: false })
    return unwrap(res).map((r) => toWant(r as WantRow))
  },
  async addWant({ placeId, sourceUrl = null, sourceType = null, note = '' }) {
    const res = await supabase
      .from('want_to_try')
      .insert({ place_id: placeId, source_url: sourceUrl, source_type: sourceType, note })
      .select('*')
      .single()
    return toWant(unwrap(res) as WantRow)
  },
  async removeWant(id) {
    const res = await supabase.from('want_to_try').delete().eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },
  async convertWant(id) {
    const rpc = await supabase.rpc('convert_want', { p_id: id })
    const visitId = unwrap(rpc) as string
    const v = await getVisit(visitId)
    if (!v) throw new Error('Visit not found after convert')
    return v
  },

  async listShares() {
    const res = await supabase.from('shares').select('*, share_items(place_id, visit_id, position)').order('created_at', { ascending: false })
    return unwrap(res).map((r) => toShare(r as unknown as ShareRow))
  },
  createShare,
  async getShareBySlug(slug) {
    // Works logged out: get_share() is a SECURITY DEFINER function granted to anon.
    const rpc = await supabase.rpc('get_share', { p_slug: slug })
    if (rpc.error) throw new Error(rpc.error.message)
    const row = rpc.data as { slug: string; title: string; created_at: string; view_count: number; payload: RecPayload; photo_paths: string[] } | null
    if (!row) return null
    const paths = row.photo_paths.filter(Boolean)
    const signed = paths.length ? (await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600)).data ?? [] : []
    const byPath = new Map(signed.map((s) => [s.path, s.signedUrl]))
    return {
      id: row.slug, slug: row.slug, title: row.title, createdAt: row.created_at, viewCount: row.view_count,
      items: [], payload: row.payload,
      thumbs: row.photo_paths.map((p) => (p ? byPath.get(p) ?? null : null)),
    }
  },
  async recordShareView(slug) {
    await supabase.rpc('record_share_view', { p_slug: slug })
  },

  async exportAll() {
    const [visits, want, shares, photos] = await Promise.all([
      listVisits(),
      supabaseJournal.listWant(),
      supabaseJournal.listShares(),
      supabase.from('visit_photos').select('*').then((r) =>
        unwrap(r).map((p): PhotoMeta => ({
          id: p.id as string, visitId: p.visit_id as string | null, takenAt: p.taken_at as string | null,
          lat: p.lat as number | null, lng: p.lng as number | null, createdAt: p.created_at as string,
        })),
      ),
    ])
    return { exportedAt: new Date().toISOString(), app: 'recd', visits, want, shares, photos }
  },

  async loadDemoData() {
    await requireUserId()
    const [places, tags, existing, existingWant] = await Promise.all([allPlaces(), listTags(), listVisits(), supabaseJournal.listWant()])
    const byFixtureId = new Map(places.map((p) => [p.googlePlaceId.replace(/^fixture_/, ''), p]))
    const demo = buildDemoData()

    const seen = new Set(existing.map((v) => `${v.placeId}|${v.note}`))
    const fresh = demo.visits.filter((v) => {
      const p = byFixtureId.get(v.placeId)
      return p && !seen.has(`${p.id}|${v.note}`)
    })

    let inserted: Visit[] = []
    if (fresh.length) {
      const res = await supabase
        .from('visits')
        .insert(
          fresh.map((v) => ({
            place_id: byFixtureId.get(v.placeId)!.id, visited_on: v.visitedOn, feeling: v.feeling, note: v.note,
            recommendable: v.recommendable, price_paid_level: v.pricePaidLevel,
          })),
        )
        .select('id')
      const ids = unwrap(res).map((r) => r.id as string) // returned in insert order
      const dishes = fresh.flatMap((v, i) => v.dishes.map((name, position) => ({ visit_id: ids[i], name, position })))
      const tagRows = fresh.flatMap((v, i) => v.tagIds.map((tag_id) => ({ visit_id: ids[i], tag_id })))
      if (dishes.length) unwrap(await supabase.from('visit_dishes').insert(dishes).select('id'))
      if (tagRows.length) unwrap(await supabase.from('visit_tags').insert(tagRows).select('visit_id'))
      inserted = fresh.map((v, i) => ({ ...v, id: ids[i], placeId: byFixtureId.get(v.placeId)!.id }))
    }

    const wantKey = new Set(existingWant.map((w) => `${w.placeId}|${w.sourceUrl}`))
    const wants = demo.want
      .map((w) => ({ w, p: byFixtureId.get(w.placeId) }))
      .filter((x) => x.p && !wantKey.has(`${x.p.id}|${x.w.sourceUrl}`))
      .map((x) => ({ place_id: x.p!.id, source_url: x.w.sourceUrl, source_type: x.w.sourceType, note: x.w.note }))
    if (wants.length) unwrap(await supabase.from('want_to_try').insert(wants).select('id'))

    if (inserted.length && (await supabaseJournal.listShares()).length === 0) {
      const newByDemoId = new Map(fresh.map((v, i) => [v.id, inserted[i]]))
      const items = demo.shares[0].items
        .map((it) => newByDemoId.get(it.visitId ?? ''))
        .filter((v): v is Visit => !!v)
        .map((v) => ({ place: places.find((p) => p.id === v.placeId)!, visit: v }))
      if (items.length) {
        const payload: RecPayload = { v: 1, title: demo.shares[0].title, items: items.map((i) => toRecItem(i.place, i.visit, tags)) }
        await createShare({ title: payload.title, items: items.map((i) => ({ placeId: i.place.id, visitId: i.visit.id })), payload })
      }
    }
  },

  async clearAll() {
    const photos = await supabase.from('visit_photos').select('storage_path')
    const paths = (photos.data ?? []).map((p) => p.storage_path as string)
    if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
    // Row-level security scopes every delete to the signed-in user; the filter satisfies PostgREST's "no bare DELETE" rule.
    for (const table of ['shares', 'want_to_try', 'visit_photos', 'visits'] as const) {
      const res = await supabase.from(table).delete().not('id', 'is', null)
      if (res.error) throw new Error(res.error.message)
    }
  },
}
