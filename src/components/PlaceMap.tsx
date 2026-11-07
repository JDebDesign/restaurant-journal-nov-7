import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Entry } from '@/lib/recs'

interface Props {
  entries: Entry[]
  onSelect: (visitId: string) => void
}

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

// Backend/prod step: replace the OSM demo tiles with a hosted tile provider (MapTiler, Stadia, Mapbox).
export default function PlaceMap({ entries, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    if (!el.current) return
    map.current = new maplibregl.Map({ container: el.current, style: STYLE, center: [-84.39, 33.77], zoom: 10.5, attributionControl: { compact: true } })
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((x) => x.remove())
    markers.current = entries.map((e) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.setAttribute('aria-label', `${e.place.name}, ${e.place.neighborhood}`)
      btn.className = 'flex size-11 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-lg shadow-lg'
      btn.textContent = e.visit.feeling === 'loved' ? '❤' : '●'
      btn.style.color = 'white'
      btn.addEventListener('click', () => selectRef.current(e.visit.id))
      const popup = new maplibregl.Popup({ offset: 24, closeButton: false }).setText(e.place.name)
      return new maplibregl.Marker({ element: btn }).setLngLat([e.place.lng, e.place.lat]).setPopup(popup).addTo(m)
    })
    if (entries.length > 0) {
      const b = new maplibregl.LngLatBounds()
      entries.forEach((e) => b.extend([e.place.lng, e.place.lat]))
      m.fitBounds(b, { padding: 60, maxZoom: 14, duration: 0 })
    }
  }, [entries])

  return <div ref={el} role="region" aria-label="Map of your places" className="h-[60dvh] w-full overflow-hidden rounded-2xl border border-line" />
}
