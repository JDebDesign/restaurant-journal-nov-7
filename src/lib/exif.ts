import exifr from 'exifr'

export interface PhotoInfo {
  lat: number | null
  lng: number | null
  /** ISO date YYYY-MM-DD (local) and full ISO timestamp, if the photo has a capture time */
  date: string | null
  takenAt: string | null
}

const NONE: PhotoInfo = { lat: null, lng: null, date: null, takenAt: null }

/** Reads GPS + capture time. Never throws: iOS often strips GPS, and some files have no EXIF at all. */
export async function readPhotoInfo(file: Blob | Uint8Array): Promise<PhotoInfo> {
  try {
    const out = await exifr.parse(file, { gps: true, tiff: true, exif: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'] })
    if (!out) return NONE
    const when: Date | undefined = out.DateTimeOriginal ?? out.CreateDate
    const valid = when instanceof Date && !Number.isNaN(when.getTime())
    const lat = typeof out.latitude === 'number' ? out.latitude : null
    const lng = typeof out.longitude === 'number' ? out.longitude : null
    return {
      lat: lat !== null && lng !== null ? lat : null,
      lng: lat !== null && lng !== null ? lng : null,
      date: valid ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}` : null,
      takenAt: valid ? when.toISOString() : null,
    }
  } catch {
    return NONE
  }
}

/** First photo with GPS wins; first photo with a date supplies the visit date. */
export function summarize(infos: PhotoInfo[]): { lat: number; lng: number } | null {
  const hit = infos.find((i) => i.lat !== null && i.lng !== null)
  return hit ? { lat: hit.lat!, lng: hit.lng! } : null
}
