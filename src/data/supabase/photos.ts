import { uuid } from '@/lib/uuid'
import type { PhotoStore } from '../services'
import type { PhotoMeta } from '../types'
import { PHOTO_BUCKET, requireUserId, supabase, unwrap } from './client'

interface PhotoRow {
  id: string
  visit_id: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  created_at: string
  storage_path: string
}

const toMeta = (r: PhotoRow): PhotoMeta => ({
  id: r.id, visitId: r.visit_id, takenAt: r.taken_at, lat: r.lat, lng: r.lng, createdAt: r.created_at,
})

const EXT: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }
const SIGNED_FOR = 24 * 3600
const urls = new Map<string, { url: string; expires: number }>()

export const supabasePhotos: PhotoStore = {
  async add(blob, meta) {
    const userId = await requireUserId()
    const id = uuid()
    const type = blob.type || 'image/jpeg'
    const path = `${userId}/${id}.${EXT[type] ?? 'jpg'}`
    const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: type })
    if (up.error) throw new Error(up.error.message)
    const res = await supabase
      .from('visit_photos')
      .insert({ id, storage_path: path, taken_at: meta.takenAt, lat: meta.lat, lng: meta.lng })
      .select('*')
      .single()
    if (res.error) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path])
      throw new Error(res.error.message)
    }
    return toMeta(res.data as PhotoRow)
  },
  async list() {
    const res = await supabase.from('visit_photos').select('*').order('created_at')
    return unwrap(res).map((r) => toMeta(r as PhotoRow))
  },
  async getUrl(id) {
    const hit = urls.get(id)
    if (hit && hit.expires > Date.now()) return hit.url
    const row = await supabase.from('visit_photos').select('storage_path').eq('id', id).maybeSingle()
    if (!row.data) return null
    const signed = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(row.data.storage_path, SIGNED_FOR)
    if (!signed.data) return null
    urls.set(id, { url: signed.data.signedUrl, expires: Date.now() + (SIGNED_FOR - 600) * 1000 })
    return signed.data.signedUrl
  },
  async attach(photoIds, visitId) {
    if (photoIds.length === 0) return
    const res = await supabase.from('visit_photos').update({ visit_id: visitId }).in('id', photoIds)
    if (res.error) throw new Error(res.error.message)
  },
  async remove(id) {
    const row = await supabase.from('visit_photos').select('storage_path').eq('id', id).maybeSingle()
    const del = await supabase.from('visit_photos').delete().eq('id', id)
    if (del.error) throw new Error(del.error.message)
    if (row.data) await supabase.storage.from(PHOTO_BUCKET).remove([row.data.storage_path])
    urls.delete(id)
  },
}
