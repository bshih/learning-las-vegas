# Map and Data Layer

## Objective

Provide the map abstraction and static intersection data interface used by the game loop.

## Owns

- `src/data/*`
- `src/lib/geo.ts`
- `src/lib/questions.ts`
- map adapter files under `src/map/*` or equivalent.
- Static assets needed for map rendering.

## Requirements

- Define TypeScript types for streets/intersections/questions.
- Load static seed intersections from JSON or TS data.
- Provide deterministic question selection.
- Compute distance between coordinates.
- Convert map clicks into lat/lon guesses.
- Render true and guessed markers.
- Keep road labels hidden or visually secondary during guessing when using a real map.
- Provide a fallback coordinate-map if MapLibre is not viable quickly.

## Map Behavior

Initial viewport should cover the Las Vegas valley.

Useful bounds:

- Southwest: lat `35.90`, lon `-115.45`
- Northeast: lat `36.38`, lon `-114.90`

The map must remain playable on desktop and mobile widths.

## Acceptance

- Guess coordinates are plausible Las Vegas lat/lon values.
- Scoring uses real distance, not screen pixels.
- Map renders without external secrets.
- No gameplay dependency on live geocoding APIs.

