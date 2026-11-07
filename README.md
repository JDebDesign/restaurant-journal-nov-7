# Recd

A restaurant journal that makes logging effortless and recommending instant. Mobile-first PWA built with React, Vite and TypeScript. **Front end only for now**: data is stored in your browser, and Supabase comes later (see `DECISIONS.md`).

## Run it

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and tap **Try the demo journal**, or enter any email (then tap **Open magic link**, which stands in for the real email). `alanna@example.com` comes with 16 demo visits; other emails start empty (Settings has **Load demo data**).

Tip: use your browser's device toolbar at 375px wide.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run preview` | Production build / serve it on :4173 |
| `npm test` | Unit tests (Vitest): recs ordering, filters, EXIF-to-place matching, share payloads |
| `npm run test:e2e` | Playwright at 375px: log a visit, photo GPS/no-GPS, convert want-to-try, find a rec, logged-out share link, layout, a11y (axe), PWA |
| `npm run lint` | oxlint |
| `npx tsx scripts/make-fixture-photos.ts` | Regenerate the EXIF test photos |
| `npx tsx scripts/make-icons.ts` | Regenerate placeholder PWA icons |

First time running e2e: `npx playwright install chromium`.

## What's in the app

- **Quick log**: search a place (3 taps from the log screen, only the restaurant is required) or add 1-5 photos. Photo GPS and date are read with `exifr` and the top 3 nearby places are suggested; no GPS falls back to search.
- **My places**: list or map, filters (occasion, vibe, price, neighborhood, feeling, recommendable only) and search across names, dishes and notes.
- **Want to try**: save by search or by pasting an Instagram, TikTok or Maps link; one tap turns it into a visit.
- **Someone asked me**: pick up to 3 constraints, get your best-loved most-recent matches, share up to 5 as one card.
- **Share rec**: public `/r/:slug` card, no account needed.
- **Settings**: profile, export JSON, demo data, sign out.
- Photo "nudge" banner for photos you picked but never logged.

## Project layout

```
src/data/services.ts     contracts the UI depends on (swap point for Supabase)
src/data/local/          localStorage + IndexedDB implementations
src/data/fixtures/       Atlanta places, tags, demo seed
src/lib/                 pure logic: recs, filters, exif, share, geo
src/pages, components/   UI
docs/schema.sql          reference Postgres schema + RLS for the backend step
e2e/, tests/unit/        tests
```

## Moving to Supabase later

1. Create a Supabase project, apply `docs/schema.sql` as a migration, add a seed script from `src/data/fixtures`.
2. Write `src/data/supabase/{auth,places,journal,photos}.ts` implementing the interfaces in `src/data/services.ts`; point `src/data/index.ts` at them. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. Keep the Google Places key server-side (Edge Function): search/nearby/details, cached into `places`.
4. Serve `/r/:slug` with real OG tags and an `og:image` (render `/r/:slug/card`, or port it to `@vercel/og`) and read share content from the DB.
5. Add the RLS test (sign in as two users, assert no cross-user reads or writes).

## Deploy (static)

Any static host works. On Vercel: framework preset **Vite**, build `npm run build`, output `dist`, plus a rewrite of all paths to `/index.html` for client routing:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Save that as `vercel.json`. No environment variables are needed yet.
