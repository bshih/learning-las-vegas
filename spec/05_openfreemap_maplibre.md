# OpenFreeMap + MapLibre Renderer

## Status

Done.

## Objective

Replace the custom CARTO raster-tile renderer with MapLibre GL JS using OpenFreeMap vector tiles and styles. Improve native street-label readability and zoom-dependent level of detail without API keys, billing, or custom raster processing.

## Scope

- Preserve the existing `MapAdapter` contract used by `MapStage`.
- Render the OpenFreeMap Bright style through MapLibre GL JS.
- Convert map clicks to longitude/latitude guesses.
- Render separate guess/correct markers for misses, one enlarged success marker for correct guesses, and the exact-answer callout.
- Hide text-bearing vector symbol layers while guessing and restore their original visibility after reveal.
- Let the reveal-state map overlay advance directly to the next question.
- Preserve reveal zoom/pan and reset to the valley frame for a new question.
- Provide zoom and reset controls and keep required attribution visible.

## Out Of Scope

- Live geocoding, routing, search, or corpus generation.
- Changes to scoring, snap radius, question order, or area filtering.
- A CARTO fallback; service reliability is not critical for this version.
- Self-hosting vector tiles or PMTiles.

## Acceptance

- Initial guessing view shows road geometry without street, neighborhood, POI, or airport labels.
- Reveal shows native vector street labels with zoom-level density and collision handling.
- Clicking still produces plausible Las Vegas coordinates and completes the existing result flow.
- Guess/correct markers and answer callout remain legible.
- New questions reset to the valley frame.
- Desktop and mobile layouts render without overlap or console errors.
- `npm run validate:seed` and `npm run build` pass.
