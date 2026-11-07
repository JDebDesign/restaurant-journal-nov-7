import { daysAgoISO } from '@/lib/dates'
import type { Feeling, PriceLevel, Share, Visit, WantToTry } from '../types'

type V = [
  placeId: string, daysAgo: number, feeling: Feeling, paid: PriceLevel, dishes: string[],
  tags: string[], note: string, recommendable?: boolean,
]

const VISITS: V[] = [
  ['miller-union', 9, 'loved', 3, ['Baked farm egg', 'Skillet-fried chicken'], ['date-night', 'impress-visitors', 'cozy'],
    'Calm, special, and the egg is a must. Ask for the back room.'],
  ['chai-pani', 16, 'loved', 2, ['Sloppy Joe', 'Okra fries', 'Bhel puri'], ['groups', 'lively', 'quick-bite'],
    'Loud, colorful, perfect for a big group. Order a few chaats to share.'],
  ['fox-bros-bar-b-q', 30, 'liked', 2, ['Brisket', 'Texas Twinkie'], ['groups', 'family', 'lively'],
    'Reliable barbecue, huge portions. Go early on weekends.'],
  ['antico-pizza-napoletana', 45, 'loved', 2, ['Margherita', 'Diavola'], ['groups', 'lively', 'family'],
    'Worth the line. Eat at the long communal tables.'],
  ['bacchanalia', 70, 'loved', 4, ['Tasting menu'], ['date-night', 'impress-visitors', 'cozy'],
    'Our big-occasion spot. Book weeks ahead and tell them it is a celebration.'],
  ['octopus-bar', 21, 'loved', 3, ['Pork belly bao', 'Crispy rice'], ['late-night', 'date-night', 'lively'],
    'Best after 10pm. Sit at the bar if you can.'],
  ['sun-in-my-belly', 5, 'liked', 2, ['Cornmeal pancakes', 'Biscuit sandwich'], ['brunch', 'family', 'cozy'],
    'Cute brunch, easy with a stroller. Not too crowded before 10.'],
  ['home-grown', 12, 'liked', 1, ['Grits', 'Fried chicken biscuit'], ['brunch', 'solo', 'quick-bite'],
    'Cheap, hearty breakfast. Great solo at the counter.'],
  ['superica', 3, 'meh', 2, ['Queso', 'Fish tacos'], ['groups', 'lively', 'outdoor'],
    'Fun patio, food was just fine. Go for the margs.', false],
  ['ticonderoga-club', 38, 'liked', 3, ['Daiquiri', 'Deviled eggs'], ['date-night', 'late-night', 'cozy'],
    'Tiny and dim, great for a pre-dinner drink.'],
  ['hankook-taqueria', 8, 'liked', 1, ['Bulgogi taco'], ['quick-bite', 'solo'], 'Fast, cheap, and the tacos are great.'],
  ['umi', 90, 'liked', 4, ['Omakase'], ['date-night', 'impress-visitors'],
    'Beautiful fish and service. A splurge, but a good one.'],
  ['busy-bee-cafe', 55, 'loved', 2, ['Fried chicken', 'Collard greens', 'Peach cobbler'], ['family', 'impress-visitors'],
    'Classic soul food. Take visiting family here.'],
  ['the-varsity', 120, 'meh', 1, ['Chili dog'], ['quick-bite', 'family'],
    'A fun Atlanta tradition for visitors, not a food destination.', false],
  ['brickstore-pub', 27, 'liked', 2, ['Frites'], ['solo', 'cozy'], 'Great beer list and a quiet corner for one.'],
  ['revolution-doughnuts', 6, 'liked', 1, ['Maple bacon doughnut'], ['quick-bite', 'solo'], 'Worth the detour for coffee and a doughnut.'],
]

export function buildDemoData(now = new Date()) {
  const stamp = now.toISOString()
  const visits: Visit[] = VISITS.map(([placeId, ago, feeling, paid, dishes, tagIds, note, rec], i) => ({
    id: `demo-v${i + 1}`,
    placeId,
    visitedOn: daysAgoISO(ago, now),
    feeling,
    note,
    recommendable: rec ?? feeling !== 'meh',
    pricePaidLevel: paid,
    dishes,
    tagIds,
    photoIds: [],
    createdAt: stamp,
    updatedAt: stamp,
  }))

  const want: WantToTry[] = [
    { id: 'demo-w1', placeId: 'ecco', sourceUrl: 'https://www.instagram.com/p/Cdemo1/', sourceType: 'instagram', note: 'Saw the burrata', createdAt: stamp, convertedVisitId: null },
    { id: 'demo-w2', placeId: 'little-bear', sourceUrl: 'https://www.tiktok.com/@eatatl/video/123', sourceType: 'tiktok', note: '', createdAt: stamp, convertedVisitId: null },
    { id: 'demo-w3', placeId: 'gunshow', sourceUrl: 'https://www.google.com/maps/place/Gunshow/', sourceType: 'maps', note: 'Birthday?', createdAt: stamp, convertedVisitId: null },
    { id: 'demo-w4', placeId: 'pura-vida', sourceUrl: null, sourceType: null, note: 'From Sam', createdAt: stamp, convertedVisitId: null },
  ]

  const shares: Share[] = [
    {
      id: 'demo-s1',
      slug: 'demo-date-night',
      title: 'Date night in Atlanta',
      createdAt: stamp,
      viewCount: 0,
      items: [
        { placeId: 'miller-union', visitId: 'demo-v1' },
        { placeId: 'bacchanalia', visitId: 'demo-v5' },
        { placeId: 'ticonderoga-club', visitId: 'demo-v10' },
      ],
    },
  ]

  return { visits, want, shares }
}
