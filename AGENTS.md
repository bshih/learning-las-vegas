# Melissa Map Project Instructions

Melissa Map is a static-first Las Vegas intersection-training web app: players click a map, the app resolves the nearest known intersection, and progress stays local.

## Setup

- The stack is React 19, Vite 8, and strict TypeScript, managed with npm via `package-lock.json`.
- The repository does not document an install/bootstrap command or declare a Node version. Do not invent one in project documentation; confirm it when setup work is in scope.
- The app needs no secrets or live geocoder. Its custom map loads public CARTO raster tiles at runtime.

## Test and Validation

- `npm run validate:seed` runs dependency-free, offline checks for the intersection corpus, area buckets, Las Vegas bounds, required streets, and guarded coordinates.
- `npm run verify:seed:coords` checks seed points against OpenStreetMap road geometry through Overpass. It requires network access and is intentionally separate from the build.
- Run both seed checks after editing intersection names, coordinates, regions, or area buckets; report Overpass/DNS outages separately from data failures.
- There is no configured unit/integration test runner and no `lint` script. Do not claim `npm test` or a lint command exists.
- `npm run build` is the configured type/build check because it runs `tsc -b` before the Vite production build.

## Build and Run

- `npm run dev` starts the Vite development server.
- `npm run build` type-checks and writes the production bundle to `dist/`.
- `npm run preview` serves the built bundle with Vite preview.

## Architecture

- `index.html` loads `src/main.tsx`; `src/App.tsx` wires the quiz UI to the game loop.
- `src/components/` contains small React UI pieces; `src/state/gameLoop.ts` owns reveal/next/reset flow and `localStorage` persistence.
- `src/data/` owns JSON seed data, normalized area buckets, and public data contracts. Import the canonical `intersections` export from `src/data`.
- `src/lib/` owns deterministic question selection, haversine distance/scoring, and road feedback.
- `src/map/coordinateMap.ts` is a custom DOM/raster-tile adapter behind the `src/map` contract; preserve that seam if replacing the renderer.
- `src/styles/theme.css` holds shared visual tokens; `src/styles/app.css` holds component and map styles.
- `scripts/` contains seed QA tools. `spec/` contains the product specs, progress log, and implementation decisions; read those before changing behavior.

## Domain Rules

- Gameplay is static-first: do not add live geocoding or corpus-building calls to the question loop.
- Keep `src/data/intersections.json` as the seed source of truth. IDs must stay stable; streets, coordinates, region, difficulty, and aliases are validated.
- Preserve descriptive `region` separately from normalized player-facing `area`. Every exposed area bucket must contain at least 10 intersections.
- Question order is deterministic from the seed and intersection ID. Area selection filters both the question deck and the nearest-intersection scoring pool.
- Score geographic coordinates with haversine distance, never screen pixels. A correct guess must resolve to the requested nearest intersection and fall within the 650 m snap radius.
- Keep feedback coarse: correct/missed plus 1-5 closeness points. Do not silently restore granular 0-100 distance scoring.
- Progress persists under `melissa-map-progress-v1`; changing area resets that area's deck, while Reset preserves the selected area.
- During guessing, keep road labels hidden/secondary; reveal mode supplies labels, answer markers, and nearby context. Preserve OpenStreetMap/CARTO attribution.
- Treat seed coordinates as playable approximations. Record uncertainty in `src/data/seed-notes.md` and use both QA scripts before tightening thresholds.
- Keep `spec/progress.md` and `spec/implementation-notes.html` current for non-trivial product or architecture changes.
