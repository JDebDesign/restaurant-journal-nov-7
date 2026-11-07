import { createStore, del, get, set } from 'idb-keyval'
import type { PhotoStore } from '../services'
import { currentUser, readDB, uid, update } from './db'

// Blobs live in IndexedDB; metadata lives in the per-user DB so it can be queried.
let store: ReturnType<typeof createStore> | null = null
const idb = () => (store ??= createStore('recd-photos', 'blobs'))
const key = (id: string) => `${currentUser()?.userId}:${id}`
const urls = new Map<string, string>()

export const localPhotos: PhotoStore = {
  async add(blob, meta) {
    const id = uid()
    await set(key(id), blob, idb())
    const photo = { id, visitId: null, takenAt: meta.takenAt, lat: meta.lat, lng: meta.lng, createdAt: new Date().toISOString() }
    update((db) => void db.photos.push(photo))
    return photo
  },
  async list() {
    return readDB().photos
  },
  async getUrl(id) {
    const k = key(id)
    const hit = urls.get(k)
    if (hit) return hit
    const blob = await get<Blob>(k, idb())
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    urls.set(k, url)
    return url
  },
  async attach(photoIds, visitId) {
    update((db) => {
      for (const p of db.photos) if (photoIds.includes(p.id)) p.visitId = visitId
      const v = db.visits.find((x) => x.id === visitId)
      if (v) v.photoIds = [...new Set([...v.photoIds, ...photoIds])]
    })
  },
  async remove(id) {
    await del(key(id), idb())
    update((db) => {
      db.photos = db.photos.filter((p) => p.id !== id)
      for (const v of db.visits) v.photoIds = v.photoIds.filter((x) => x !== id)
    })
  },
}
