# Progress

## 2026-06-28

- `00_overview.md`: done
- `01_app_shell_game_loop.md`: done
- `02_map_data_layer.md`: done
- `03_seed_corpus.md`: done

## Blockers

- No blockers yet.

## Notes

- Workspace started empty and not as a git repository.
- Parallel threads should keep ownership boundaries tight.
- Map/data layer shipped as pure TypeScript because no package scaffold exists yet: typed data contracts, geodesic scoring, deterministic question decks, and a DOM/SVG coordinate-map fallback adapter.
- Workstream 3 added a 70-intersection static seed corpus, seed notes, and a dependency-free validation helper. App integration should prefer `intersections` from `src/data`.
- App shell now uses the canonical `intersections` export plus `getQuestionAt`, `scoreGuess`, and `createCoordinateMapAdapter`.
- Browser dogfood covered 10 consecutive questions, reset, reload persistence, and console error check.
- 2026-06-29: Replaced the placeholder SVG grid with dependency-free CARTO raster tiles. Guessing uses no-label tiles; reveal fades in label tiles plus the correct marker.
- 2026-06-29: Tightened the default viewport to the developed valley, added map zoom/pan/reset controls, splits overlapping marker labels, and added a lightweight same-road feedback hint.
- 2026-06-29: Adjusted the map UX after browser review: start slightly farther out, switch to higher-contrast neutral CARTO tiles, and preserve zoom on reveal while only nudging the center if markers would be near the edge.
- 2026-06-29: Restored the default valley frame whenever a fresh unrevealed question starts, so zoomed/panned reveal context does not carry into the next prompt.
- 2026-06-29: Replaced the failed cool-toned Voyager filter with inverted CARTO dark tiles, yielding a light gray map with darker non-yellow road lines.
- 2026-06-29: Added a generated slate road-grid overlay from the seed corpus because raster-only no-label tiles were either yellow or too faint at the default valley view.
- 2026-06-29: Removed the generated road overlay after QA showed it did not match real road geometry; switched back to actual CARTO Voyager tiles only, tuned darker/clearer in CSS.
- 2026-06-29: Replaced broad CSS tile filters with client-side CARTO tile post-processing: real Voyager raster tiles are converted to a higher-contrast neutral grayscale map, with yellow road pixels recolored directly and original tiles used as fallback if processing fails.
- 2026-06-29: Corrected the Lake Mead Boulevard / Las Vegas Boulevard seed point from the I-15/Lake Mead interchange to the North Las Vegas Boulevard crossing and added a seed validation guard for that QA case.
