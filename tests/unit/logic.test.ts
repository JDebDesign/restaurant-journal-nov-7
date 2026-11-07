import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildDemoData } from '@/data/fixtures/seed'
import { FIXTURE_PLACES } from '@/data/fixtures/places'
import { localPlaces } from '@/data/local/places'
import { readPhotoInfo } from '@/lib/exif'
import { EMPTY_FILTERS, applyFilters } from '@/lib/filters'
import { buildEntries, findRecs, suggestLoosening } from '@/lib/recs'
import { decodePayload, encodePayload, readPayloadFromHash } from '@/lib/share'
import { detectSource, guessPlaceName } from '@/lib/source'
import type { RecPayload } from '@/data/types'

const now = new Date('2026-11-07T12:00:00')
const demo = buildDemoData(now)
const entries = buildEntries(demo.visits, FIXTURE_PLACES)
const names = (es: typeof entries) => es.map((e) => e.place.id)

describe('seed data', () => {
  it('has ~15 visits across known places', () => {
    expect(demo.visits.length).toBeGreaterThanOrEqual(15)
    const ids = new Set(FIXTURE_PLACES.map((p) => p.id))
    expect(demo.visits.every((v) => ids.has(v.placeId))).toBe(true)
  })
})

describe('findRecs', () => {
  it('orders by feeling, then recency', () => {
    const recs = findRecs(entries, { occasion: 'date-night' })
    // loved: octopus-bar (21d), miller-union (9d), bacchanalia (70d) -> recency among loved; then liked
    expect(names(recs)).toEqual(['miller-union', 'octopus-bar', 'bacchanalia', 'ticonderoga-club', 'umi'])
  })

  it('combines occasion + price + area', () => {
    expect(names(findRecs(entries, { occasion: 'date-night', price: 3, area: 'West Midtown' }))).toEqual(['miller-union'])
    expect(names(findRecs(entries, { price: 4, area: 'Buckhead' }))).toEqual(['umi'])
  })

  it('excludes non-recommendable visits', () => {
    expect(names(findRecs(entries, {}))).not.toContain('superica')
    expect(names(findRecs(entries, {}))).not.toContain('the-varsity')
  })

  it('suggests which constraint to loosen when nothing matches', () => {
    const q = { occasion: 'brunch', price: 3 as const, area: 'Kirkwood' }
    expect(findRecs(entries, q)).toHaveLength(0)
    const s = suggestLoosening(entries, q)
    expect(s).not.toBeNull()
    expect(findRecs(entries, { ...q, [s!.drop]: null })).toHaveLength(s!.count)
  })

  it('returns null suggestion when no single drop helps', () => {
    expect(suggestLoosening(entries, { occasion: 'brunch', price: 4, area: 'Nowhere' })).toBeNull()
  })
})

describe('applyFilters', () => {
  it('searches names, dishes and notes', () => {
    expect(names(applyFilters(entries, { ...EMPTY_FILTERS, query: 'miller' }))).toEqual(['miller-union'])
    expect(names(applyFilters(entries, { ...EMPTY_FILTERS, query: 'brisket' }))).toEqual(['fox-bros-bar-b-q'])
    expect(names(applyFilters(entries, { ...EMPTY_FILTERS, query: 'stroller' }))).toEqual(['sun-in-my-belly'])
  })

  it('combines filters with AND across groups', () => {
    const f = { ...EMPTY_FILTERS, occasions: ['brunch'], feeling: 'liked' as const, recommendableOnly: true }
    expect(names(applyFilters(entries, f)).sort()).toEqual(['home-grown', 'sun-in-my-belly'])
    expect(names(applyFilters(entries, { ...f, neighborhood: 'Kirkwood' }))).toEqual(['sun-in-my-belly'])
    expect(applyFilters(entries, { ...f, price: 4 })).toHaveLength(0)
  })

  it('ORs within occasion tags and filters recommendable only', () => {
    const f = { ...EMPTY_FILTERS, occasions: ['solo', 'family'] }
    expect(names(applyFilters(entries, f))).toContain('the-varsity')
    expect(names(applyFilters(entries, { ...f, recommendableOnly: true }))).not.toContain('the-varsity')
  })
})

describe('photo -> place matching', () => {
  for (const [file, id] of [
    ['miller-union-gps.jpg', 'miller-union'],
    ['chai-pani-gps.jpg', 'chai-pani'],
    ['fox-bros-gps.jpg', 'fox-bros-bar-b-q'],
  ] as const) {
    it(`${file} suggests ${id} in top 3`, async () => {
      const info = await readPhotoInfo(readFileSync(`e2e/fixtures/${file}`))
      expect(info.lat).not.toBeNull()
      expect(info.date).toMatch(/^2026-/)
      const top = await localPlaces.nearby(info.lat!, info.lng!, 3)
      expect(top.map((p) => p.id)).toContain(id)
      expect(top[0].id).toBe(id)
    })
  }

  it('photo without GPS yields nulls, not an error', async () => {
    const info = await readPhotoInfo(readFileSync('e2e/fixtures/no-gps.jpg'))
    expect(info.lat).toBeNull()
    expect(info.date).toBe('2026-11-03')
  })

  it('garbage bytes do not throw', async () => {
    const info = await readPhotoInfo(new Uint8Array([1, 2, 3]))
    expect(info.lat).toBeNull()
  })
})

describe('places search', () => {
  it('finds by prefix and cuisine, ignores punctuation', async () => {
    expect((await localPlaces.search('mary macs'))[0].id).toBe('mary-macs-tea-room')
    expect((await localPlaces.search('pizza')).map((p) => p.id)).toContain('antico-pizza-napoletana')
    expect(await localPlaces.search('zzzz')).toEqual([])
  })
})

describe('source detection', () => {
  it('classifies urls', () => {
    expect(detectSource('https://www.instagram.com/p/abc')).toBe('instagram')
    expect(detectSource('https://vm.tiktok.com/xyz')).toBe('tiktok')
    expect(detectSource('https://www.google.com/maps/place/Foo')).toBe('maps')
    expect(detectSource('https://maps.app.goo.gl/abc')).toBe('maps')
    expect(detectSource('https://eater.com/x')).toBe('other')
    expect(detectSource('not a url')).toBe('other')
  })
  it('guesses place name from maps url', () => {
    expect(guessPlaceName('https://www.google.com/maps/place/Miller+Union/@33.79,-84.41')).toBe('Miller Union')
  })
})

describe('share payload', () => {
  const payload: RecPayload = {
    v: 1,
    title: 'Café picks — 日本',
    items: [{ name: "Mary Mac's", neighborhood: 'Midtown', priceLevel: 2, cuisine: 'Southern', why: 'Ünïcode & "quotes"', dishes: ['a'], occasions: [], feeling: 'loved', mapsUrl: 'https://x.test', reserveUrl: 'https://y.test' }],
  }
  it('round-trips including unicode', () => {
    expect(decodePayload(encodePayload(payload))).toEqual(payload)
    expect(readPayloadFromHash(`#d=${encodePayload(payload)}`)).toEqual(payload)
  })
  it('rejects garbage', () => {
    expect(decodePayload('%%%')).toBeNull()
    expect(decodePayload(encodePayload({ v: 2 } as never))).toBeNull()
  })
})
