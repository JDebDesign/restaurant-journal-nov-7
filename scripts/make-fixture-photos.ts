// Generates test JPEGs with real EXIF GPS + DateTimeOriginal for the seeded places.
// Run: npx tsx scripts/make-fixture-photos.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import piexif from 'piexifjs'
import sharp from 'sharp'
import { FIXTURE_PLACES } from '../src/data/fixtures/places.ts'

mkdirSync('e2e/fixtures', { recursive: true })

const dms = (deg: number): [[number, number], [number, number], [number, number]] => {
  const a = Math.abs(deg)
  const d = Math.floor(a)
  const m = Math.floor((a - d) * 60)
  const s = Math.round(((a - d) * 60 - m) * 60 * 10000)
  return [[d, 1], [m, 1], [s, 10000]]
}

async function make(file: string, color: string, when: string, pos?: { lat: number; lng: number }) {
  const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer()
  const exif: Record<string, Record<number, unknown>> = {
    '0th': {},
    Exif: { [piexif.ExifIFD.DateTimeOriginal]: when },
    GPS: {},
  }
  if (pos) {
    exif.GPS = {
      [piexif.GPSIFD.GPSLatitudeRef]: pos.lat >= 0 ? 'N' : 'S',
      [piexif.GPSIFD.GPSLatitude]: dms(pos.lat),
      [piexif.GPSIFD.GPSLongitudeRef]: pos.lng >= 0 ? 'E' : 'W',
      [piexif.GPSIFD.GPSLongitude]: dms(pos.lng),
    }
  }
  const out = piexif.insert(piexif.dump(exif), jpeg.toString('binary'))
  writeFileSync(`e2e/fixtures/${file}`, Buffer.from(out, 'binary'))
}

const at = (id: string) => {
  const p = FIXTURE_PLACES.find((x) => x.id === id)!
  return { lat: p.lat + 0.00012, lng: p.lng - 0.00012 } // ~15m off the pin
}

await make('miller-union-gps.jpg', '#b45309', '2026:11:01 19:42:10', at('miller-union'))
await make('chai-pani-gps.jpg', '#be123c', '2026:10:24 13:05:00', at('chai-pani'))
await make('fox-bros-gps.jpg', '#92400e', '2026:10:10 18:30:00', at('fox-bros-bar-b-q'))
await make('no-gps.jpg', '#475569', '2026:11:03 20:15:00')
console.log('fixture photos written')
