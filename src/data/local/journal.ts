import { todayISO } from '@/lib/dates'
import { buildDemoData } from '../fixtures/seed'
import { TAGS } from '../fixtures/tags'
import type { JournalRepo } from '../services'
import type { Visit } from '../types'
import { currentUser, publishShare, readDB, readPublicShare, shortSlug, uid, update, writeDB } from './db'

const now = () => new Date().toISOString()

function newVisit(placeId: string, visitedOn?: string, photoIds: string[] = []): Visit {
  const t = now()
  return {
    id: uid(), placeId, visitedOn: visitedOn ?? todayISO(), feeling: null, note: '', recommendable: false,
    pricePaidLevel: null, dishes: [], tagIds: [], photoIds, createdAt: t, updatedAt: t,
  }
}

export const localJournal: JournalRepo = {
  async listTags() {
    return TAGS
  },

  async listVisits() {
    return [...readDB().visits].sort((a, b) => b.visitedOn.localeCompare(a.visitedOn) || b.createdAt.localeCompare(a.createdAt))
  },
  async getVisit(id) {
    return readDB().visits.find((v) => v.id === id) ?? null
  },
  async createVisit({ placeId, visitedOn, photoIds }) {
    return update((db) => {
      const v = newVisit(placeId, visitedOn, photoIds)
      db.visits.push(v)
      for (const p of db.photos) if (photoIds?.includes(p.id)) p.visitId = v.id
      return v
    })
  },
  async updateVisit(id, patch) {
    return update((db) => {
      const v = db.visits.find((x) => x.id === id)
      if (!v) throw new Error('Visit not found')
      Object.assign(v, patch, { updatedAt: now() })
      return { ...v }
    })
  },
  async deleteVisit(id) {
    update((db) => {
      db.visits = db.visits.filter((v) => v.id !== id)
      for (const p of db.photos) if (p.visitId === id) p.visitId = null
      for (const w of db.want) if (w.convertedVisitId === id) w.convertedVisitId = null
    })
  },

  async listWant() {
    return [...readDB().want].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async addWant({ placeId, sourceUrl = null, sourceType = null, note = '' }) {
    return update((db) => {
      const w = { id: uid(), placeId, sourceUrl, sourceType, note, createdAt: now(), convertedVisitId: null }
      db.want.push(w)
      return w
    })
  },
  async removeWant(id) {
    update((db) => {
      db.want = db.want.filter((w) => w.id !== id)
    })
  },
  async convertWant(id) {
    return update((db) => {
      const w = db.want.find((x) => x.id === id)
      if (!w) throw new Error('Want-to-try not found')
      const v = newVisit(w.placeId)
      v.note = ''
      db.visits.push(v)
      w.convertedVisitId = v.id
      return v
    })
  },

  async listShares() {
    return [...readDB().shares].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async createShare({ title, items, payload, thumbs }) {
    return update((db) => {
      const s = { id: uid(), slug: shortSlug(), title, createdAt: now(), viewCount: 0, items, payload, thumbs }
      db.shares.push(s)
      publishShare(s)
      return s
    })
  },
  async getShareBySlug(slug) {
    return readPublicShare(slug)
  },
  async recordShareView(slug) {
    // Logged-out viewers have no DB; count against the public index only.
    const s = readPublicShare(slug)
    if (!s) return
    s.viewCount += 1
    publishShare(s)
    if (currentUser()) {
      const db = readDB()
      const own = db.shares.find((x) => x.slug === slug)
      if (own) {
        own.viewCount = s.viewCount
        writeDB(db)
      }
    }
  },

  async exportAll() {
    const db = readDB()
    return { exportedAt: now(), app: 'recd', ...db }
  },
  async loadDemoData() {
    const demo = buildDemoData()
    update((db) => {
      const have = new Set(db.visits.map((v) => v.id))
      db.visits.push(...demo.visits.filter((v) => !have.has(v.id)))
      const haveW = new Set(db.want.map((w) => w.id))
      db.want.push(...demo.want.filter((w) => !haveW.has(w.id)))
      const haveS = new Set(db.shares.map((s) => s.id))
      for (const s of demo.shares) if (!haveS.has(s.id)) { db.shares.push(s); publishShare(s) }
    })
  },
  async clearAll() {
    writeDB({ visits: [], want: [], shares: [], photos: [] })
  },
}
