# Melissa Map Design

## Reference

- Map reference: Google Maps road hierarchy and label behavior. Major roads should read first, local streets should stay quiet, and labels should appear progressively as the player zooms.
- Product reference: the existing Melissa Map game shell. This renderer migration should not redesign the surrounding game UI.

## Typography

- App UI uses the existing `Avenir Next`-led sans-serif stack with strong, compact headings and readable body text.
- Map labels come from the vector basemap style so placement, collision handling, and zoom-level detail stay geographically correct.
- No decorative letter spacing or oversized type inside compact panels.

## Color

- Background: `#f6f7f9`
- Surface: `#ffffff`
- Primary text: `#172033`
- Muted text: `#657082`
- Border: `#d7dde7`
- Guess marker: `#2563eb`
- Correct marker: `#dc2626`
- Map: OpenFreeMap Bright, with clean road hierarchy and restrained land-use color.

## Spacing And Shape

- Existing `0.5rem`, `0.75rem`, `1rem`, and `1.5rem` spacing scale.
- Corners stay subtle: 6-8px for the existing shell and map frame.
- Shadows are reserved for floating controls, markers, and the exact-answer callout.

## Map Behavior

- Hide every text-bearing basemap symbol layer while the player is guessing, including roads, neighborhoods, POIs, and airport labels.
- Restore native vector labels after reveal; do not generate separate learning tags.
- Keep the exact-answer callout visually stronger than ordinary map labels.
- Preserve pan and zoom during reveal; reset to the valley frame for a new question.
- Maintain source attribution in the map viewport.

## Do

- Let vector-tile zoom levels and collision handling determine label density.
- Keep local streets visible but subordinate to arterials and highways.
- Use familiar map controls and retain a reset-to-valley command.
- Make the reveal-state map overlay a direct Next action.

## Don't

- Do not process raster tiles or draw synthetic road-name tags.
- Do not show POI clutter while guessing.
- Do not change scoring, question order, or the surrounding game layout as part of map rendering work.
