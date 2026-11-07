import type { Place, PriceLevel } from '../types'

// Illustrative Atlanta fixture data used until Google Places is wired up on the backend.
// Names are real-world style examples, but cuisine/price/coordinates are approximate and
// MUST NOT be treated as authoritative. Coordinates are neighborhood centers plus a small
// deterministic offset per place (~100-150m apart) so photo-GPS matching is unambiguous.

const HOODS: Record<string, [number, number]> = {
  Midtown: [33.7810, -84.3830],
  'West Midtown': [33.7930, -84.4100],
  'Old Fourth Ward': [33.7725, -84.3655],
  'Inman Park': [33.7580, -84.3520],
  'Virginia-Highland': [33.7810, -84.3540],
  Decatur: [33.7748, -84.2963],
  Buckhead: [33.8380, -84.3790],
  'East Atlanta Village': [33.7400, -84.3440],
  'Candler Park': [33.7650, -84.3400],
  Westside: [33.7870, -84.4130],
  Downtown: [33.7560, -84.3900],
  'Grant Park': [33.7400, -84.3720],
  Reynoldstown: [33.7460, -84.3550],
  'West End': [33.7360, -84.4130],
  Kirkwood: [33.7470, -84.3200],
}

// name, neighborhood, cuisine, price, website?
type Row = [string, keyof typeof HOODS, string, PriceLevel, string | null]

const ROWS: Row[] = [
  ['Mary Mac\'s Tea Room', 'Midtown', 'Southern', 2, 'https://marymacs.com'],
  ['The Varsity', 'Midtown', 'American diner', 1, 'https://thevarsity.com'],
  ['Ecco', 'Midtown', 'Mediterranean', 3, 'https://eccoatlanta.com'],
  ['The Lawrence', 'Midtown', 'New American', 3, null],
  ['Sublime Doughnuts', 'Midtown', 'Bakery', 1, null],
  ['Antico Pizza Napoletana', 'West Midtown', 'Pizza', 2, 'https://anticoatl.com'],
  ['Miller Union', 'West Midtown', 'Southern, farm-to-table', 3, 'https://millerunion.com'],
  ['Bacchanalia', 'West Midtown', 'New American tasting menu', 4, 'https://starprovisions.com'],
  ['Cooks & Soldiers', 'West Midtown', 'Basque', 3, null],
  ['Hankook Taqueria', 'Westside', 'Korean-Mexican', 1, null],
  ['Ormsby\'s', 'Westside', 'Gastropub, bocce', 2, null],
  ['Botiwalla', 'Old Fourth Ward', 'Indian street food', 1, null],
  ['Tiny Lou\'s', 'Old Fourth Ward', 'French-inspired', 3, null],
  ['Poor Calvin\'s', 'Old Fourth Ward', 'Southern, Asian-inflected', 3, null],
  ['Jeni\'s Splendid Ice Creams', 'Old Fourth Ward', 'Ice cream', 1, 'https://jenis.com'],
  ['Superica', 'Inman Park', 'Tex-Mex', 2, 'https://superica.com'],
  ['Ticonderoga Club', 'Inman Park', 'Cocktail bar, small plates', 3, null],
  ['Fritti', 'Inman Park', 'Neapolitan pizza', 2, null],
  ['Pura Vida', 'Inman Park', 'Latin American tapas', 3, null],
  ['Atkins Park Tavern', 'Virginia-Highland', 'American tavern', 2, null],
  ['Sauce Pizza & Wine', 'Virginia-Highland', 'Pizza, wine', 2, null],
  ['Chai Pani', 'Decatur', 'Indian street food', 2, 'https://chaipanidecatur.com'],
  ['Revolution Doughnuts', 'Decatur', 'Doughnuts, coffee', 1, null],
  ['Victory Sandwich Bar', 'Decatur', 'Sandwiches, cocktails', 1, null],
  ['Brickstore Pub', 'Decatur', 'Pub, Belgian beer', 2, null],
  ['Atlas', 'Buckhead', 'Contemporary American', 4, null],
  ['Umi', 'Buckhead', 'Japanese, sushi', 4, null],
  ['Aria', 'Buckhead', 'New American', 4, null],
  ['Octopus Bar', 'East Atlanta Village', 'Izakaya, late night', 3, null],
  ['The Glenwood', 'East Atlanta Village', 'Neighborhood American', 2, null],
  ['Fox Bros. Bar-B-Q', 'Candler Park', 'Texas barbecue', 2, 'https://foxbrosbbq.com'],
  ['Escorpion', 'Candler Park', 'Mexican, mezcal', 2, null],
  ['Gunshow', 'Grant Park', 'Chef-driven American', 3, null],
  ['Home Grown', 'Reynoldstown', 'Southern breakfast', 1, null],
  ['Little Bear', 'Reynoldstown', 'Seasonal, wine', 3, null],
  ['Slutty Vegan', 'West End', 'Vegan burgers', 1, null],
  ['Busy Bee Cafe', 'West End', 'Soul food', 2, null],
  ['Sun in My Belly', 'Kirkwood', 'Brunch, Southern', 2, null],
  ['Muss & Turner\'s', 'Downtown', 'Deli, American', 2, null],
  ['Max Lager\'s', 'Downtown', 'Brewpub', 2, null],
  ['Brush Sushi Izakaya', 'Downtown', 'Japanese', 3, null],
]

const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const FIXTURE_SYNC_DATE = '2026-11-01T00:00:00.000Z'

const perHoodCount: Record<string, number> = {}

export const FIXTURE_PLACES: Place[] = ROWS.map(([name, hood, cuisine, price, website]) => {
  const i = (perHoodCount[hood] = (perHoodCount[hood] ?? -1) + 1)
  const [lat0, lng0] = HOODS[hood]
  // 3x3 grid, 0.0012 deg ~ 130m
  const lat = lat0 + ((i % 3) - 1) * 0.0012
  const lng = lng0 + ((Math.floor(i / 3) % 3) - 1) * 0.0012
  const id = slug(name)
  const address = `${100 + i * 17} ${hood} Ave NE, Atlanta, GA`
  return {
    id,
    googlePlaceId: `fixture_${id}`,
    name,
    address,
    neighborhood: hood,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    priceLevel: price,
    cuisine,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${hood} Atlanta`)}`,
    website,
    lastSyncedAt: FIXTURE_SYNC_DATE,
  }
})

export const placeById = (id: string) => FIXTURE_PLACES.find((p) => p.id === id)
