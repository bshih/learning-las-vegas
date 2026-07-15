# Progress

## 2026-06-28

- `00_overview.md`: done
- `01_app_shell_game_loop.md`: done
- `02_map_data_layer.md`: done
- `03_seed_corpus.md`: done
- `04_area_buckets.md`: done
- `05_openfreemap_maplibre.md`: done

## 2026-07-14 Learning-game specifications

- `06_learning_game.md`: approved; implementation queued
- `07_street_geometry_data.md`: approved; phase 1 starting
- `08_street_mode.md`: approved; phase 1 starting
- `09_sessions_and_progress.md`: approved; phase 1 starting
- `10_feedback_and_rewards.md`: approved; phase 1 starting

## Blockers

- No learning-game product blocker; specs 06-10 were approved for implementation on 2026-07-14.

## Notes

- Workspace started empty and not as a git repository.
- Parallel threads should keep ownership boundaries tight.
- Map/data layer shipped as pure TypeScript because no package scaffold exists yet: typed data contracts, geodesic scoring, deterministic question decks, and a DOM/SVG coordinate-map fallback adapter.
- Workstream 3 added a 70-intersection static seed corpus, seed notes, and a dependency-free validation helper. App integration should prefer `intersections` from `src/data`.
- App shell uses the canonical `intersections` export plus `getQuestionAt`, `scoreGuess`, and the renderer-neutral `MapAdapter` contract; the current implementation is MapLibre.
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
- 2026-06-29: Replaced 0-100 distance scoring with nearest-intersection guess resolution. A click is correct when the requested intersection is the nearest known intersection within the snap radius; otherwise the reveal names the nearest known intersection instead of awarding granular points.
- 2026-06-29: Added coarse 1-5 closeness points alongside correct/missed results, so near misses still feel rewarded without returning to exact coordinate scoring.
- 2026-06-29: Deployed the built static app to the permanent here.now site at https://clever-grove-3t69.here.now/ and browser-verified the live result panel.
- 2026-06-29: Corrected Lake Mead/Rampart and Lake Mead Parkway/Boulder Highway against OSM road geometry, added static guards for the corrected rows, and added `npm run verify:seed:coords` for network-backed OSM crossing verification.
- 2026-06-29: Ran the OSM verifier across the full seed corpus and corrected additional coordinate offsets surfaced by it; remaining verifier failures point to likely invalid/non-crossing source pairs rather than simple marker drift.
- 2026-06-29: Replaced the invalid/non-crossing `Flamingo/Lamb` and `Spring Mountain/Maryland` rows with OSM-verifiable `Flamingo/Pecos` and `Desert Inn/Maryland` rows.
- 2026-06-30: Redeployed the coordinate QA fixes to the permanent here.now site and verified the live bundle references the fixed Lake Mead Parkway/Boulder Highway coordinate, not the old seed point.
- 2026-07-01: Improved reveal readability by leaving CARTO label tiles unprocessed and adding a high-contrast answer-street callout sourced from the current intersection.
- 2026-07-01: Added reveal-only learning labels generated from the seed corpus so zoomed-in review shows readable nearby street names, not just the answer streets.
- 2026-07-01: Scoped learning labels to wrong reveals only. They now appear near the resolved wrong intersection, use fewer labels at low zoom, and carry subtle east-west / north-south hints.
- 2026-07-01: Replaced learning-label direction badges with road-like placement: north-south labels rotate vertically and labels that would sit on the crossing nudge along their street axis.
- 2026-07-04: Replaced generated learning labels with processed CARTO label tiles. Base tile processing now darkens thicker major-road bands while keeping smaller streets quieter, and reveal label tiles get darkened text plus a white halo without adaptive inversion.
- 2026-07-04: Started area bucket support: normalized player-facing buckets, area-filtered deck/scoring, and a start/sidebar area chooser.
- 2026-07-04: Completed area bucket support. Seed corpus is now 76 intersections with every exposed bucket at 10+; Henderson/Green Valley and North Las Vegas/Northwest top-up rows were OSM-verified, and the browser flow was checked on desktop and mobile.
- 2026-07-04: Smoothed map zoom behavior: the default valley frame is now the zoom-out floor, wheel zoom is normalized and animation-frame batched, and the next zoom level's CARTO base/label tiles are preloaded after render to reduce first-zoom blanking.
- 2026-07-13: Started replacing the CARTO raster adapter with OpenFreeMap + MapLibre vector rendering. The accepted direction uses native zoom-dependent labels on reveal, no API key or billing, and no custom learning-label overlays.
- 2026-07-13: Completed the OpenFreeMap + MapLibre migration. Road names and shields are hidden while guessing and restored on reveal; native vector LoD replaces CARTO raster processing, while existing answer/guess markers and the exact-answer callout remain.
- 2026-07-13: Switched to OpenFreeMap Bright, expanded pre-guess hiding to every text label so neighborhood names cannot leak clues, and made the reveal overlay advance directly to the next question.
- 2026-07-13: Deployed commit `52fbde5` to the permanent here.now site and browser-verified the live guess, reveal, map-overlay Next, and reset-to-unrevealed flow with no page errors.
- 2026-07-13: Completed and deployed a responsive road-atlas design pass across layout, typography, color, controls, cards, markers, and map framing while preserving the existing game loop and map behavior. Browser-verified locally at desktop and 390px, then verified the live guess/reveal/Next path with no app errors.
- 2026-07-14: Clarified the map-overlay “Next intersection” action with a subtle green button treatment, replaced compact attribution with always-visible credits, and added persisted cumulative closeness points to the progress stats.
- 2026-07-14: Recalibrated scoring to 0-5 with a zero-point “Lost in the valley” tier beyond 12 km, replaced generic road-order language with evidence-based distance/road feedback, and simplified correct reveals to one enlarged “Nailed it” marker.
- 2026-07-14: Deployed commit `a92d69b` to the permanent here.now site and browser-verified live zero-point and exact-hit cases: Lost in the valley awarded 0/5 with no road advice, while Nailed it awarded 5/5 with one enlarged success marker and no page errors.
- 2026-07-14: Revised pending learning-game specs after product review: 0-4 scoring, 10-prompt/40-point sessions, fully playable special-shape streets, session-local repetition instead of SRS/mastery, no V1 hints or onboarding system, and confirm-before-submit for coarse pointers.
- 2026-07-14: Pushed the visual system toward a late-1950s glovebox atlas with Futura-adjacent Jost display type, Barlow Condensed road/legend typography, a route-shield masthead mark, and locally rendered matching MapLibre labels. Deployed to the permanent here.now site after desktop/mobile and reveal-state browser verification.
