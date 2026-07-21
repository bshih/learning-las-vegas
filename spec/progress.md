# Progress

## 2026-06-28

- `00_overview.md`: done
- `01_app_shell_game_loop.md`: done
- `02_map_data_layer.md`: done
- `03_seed_corpus.md`: done
- `04_area_buckets.md`: done
- `05_openfreemap_maplibre.md`: done

## 2026-07-14 Learning-game specifications

- `06_learning_game.md`: done
- `07_street_geometry_data.md`: done
- `08_street_mode.md`: done
- `09_sessions_and_progress.md`: done
- `10_feedback_and_rewards.md`: done

## Blockers

- No learning-game product blocker; specs 06-10 were approved for implementation on 2026-07-14.

## 2026-07-20 Motion polish

- `12_motion_polish.md`: done; verified locally at desktop, 390 px, and reduced motion.

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
- 2026-07-14: Integrated the approved learning-game release: separate street and intersection lessons, 10-prompt/40-point sessions, five-road study briefings, session-local repeats, coarse-pointer confirmation, richer contextual feedback, local best scores, and retry-misses sessions.
- 2026-07-14: Added 28 validated street geometries in four teaching groups, including the special-shape Rampart, Spring Mountain, Paradise, Green Valley Parkway, and Boulder Highway lesson.
- 2026-07-14: Browser-dogfooded a complete 40/40 street session, street briefing/highlights, intersection miss feedback, and the 390px responsive layout. Fixed an overlay lifecycle crash found during the pass by deferring MapLibre source access until the style is ready.
- 2026-07-14: Revised street mode after playtesting: removed the answer-list fallback and five-road briefing/repeat loop, switched normal sessions to 10 distinct streets from the full 28-road pool, and kept repetition only through the explicit Practice misses action.
- 2026-07-14: Unified the map-overlay Next action with the primary route-red button color, restored compact information-button attribution, removed the duplicated reveal callout, added a placeholder About modal, and fixed Charleston/Rampart scoring by treating co-located names for one physical crossing as equivalent.
- 2026-07-15: Deployed the UI/scoring fixes to the permanent here.now site and browser-verified the production About modal, collapsed attribution, matching red Next controls, removed answer callout, and clean console.
- 2026-07-15: Standardized both Next actions on the same Jost typography, made zero-point feedback explicitly “Lost in the valley,” replaced serious coaching copy with a lighter road-trip voice, and renamed player-facing lessons to modes.
- 2026-07-15: Renamed the public experience Learning Las Vegas, clarified the Find streets / Find intersections selected state, replaced the About placeholder with the Melissa story and stack summary, and added a reduced-motion-safe exact-hit marker animation. Audited the unchanged 28-road corpus for the next expansion batch.
- 2026-07-15: Simplified the selected mode to a single right-aligned checkmark, reframed the About stack section as “How it works,” and expanded the playable street corpus from 28 to 32 with Stephanie, St. Rose, Horizon Ridge, and Lake Mead Parkway geometry for stronger Henderson coverage.
- 2026-07-16: Replaced the About stack copy with a matter-of-fact tool summary and hid the curated street overlay during guessing so the playable road set is no longer pre-highlighted.
- 2026-07-16: Deployed the 32-road release to the permanent here.now site and browser-verified the production selector, About copy, and an unassisted Stephanie Street prompt with no app console errors.
- 2026-07-16: Replaced the separate mobile Confirm guess control with an in-place transformation of the map instruction square to “Confirm guess?”, using the same Jost typography as the map Next action.
- 2026-07-16: Deployed the in-place mobile Confirm guess control to the permanent here.now site after build and responsive browser verification.
- 2026-07-16: Expanded the static seed from 76 to 130 OSM-verified intersections using only the existing 32-road corpus. Area pools now range from 18 to 24 prompts.
- 2026-07-16: Changed normal intersection rounds to 10 distinct prompts, reserving repetition for Replay the misses, and added passive per-question timing with round total/average on the summary.
- 2026-07-16: Added a 12-street roadside-note pilot. Street reveals can now pair the existing spatial teaching note with a concise sourced landmark, navigation, corridor, history, or name-origin note; non-pilot streets retain the existing reveal unchanged.
- 2026-07-16: Replaced the street-mode guessed-road dash pattern with a continuous dark-slate highlight so segmented geometry remains visually coherent at every zoom level.
- 2026-07-16: Expanded roadside-note coverage from 12 to 24 streets with a second sourced pass focused on recognizable parks, corridor transitions, ceremonial names, and east-valley and Henderson landmarks. Eight roads remain intentionally uncovered pending stronger material.
- 2026-07-16: Prepared the project for a public Learning Las Vegas release: renamed package/docs metadata, added README and code/data licensing, linked the intended public GitHub repository from About, added baseline search/share metadata and a favicon, and preserved legacy localStorage keys for existing progress.
- 2026-07-17: Fixed and redeployed the permanent subpath at `https://lab.brianshih.com/learning-las-vegas/` by setting Vite's base path, then added canonical/homepage metadata. Browser-verified the live setup, game start, map canvas, About/repository link, and clean console.
- 2026-07-17: Added seven playful final-score judgments from “You must be visiting…” through the perfect-score “Las Vegas native,” while preserving the separate new-high-score notice.
- 2026-07-19: Expanded Find streets from 32 to 38 roads with Valley View, Washington, Desert Inn, Russell, Windmill, and Blue Diamond. Added 28 OSM-verified crossings for the same roads, bringing the intersection seed to 158.
- 2026-07-19: Refreshed Lake Mead Parkway after current OSM drift put one sampled point 191 m off the checked-in route. All 38 playable street geometries now pass the live verifier within its 75 m limit.
- 2026-07-20: Added restrained press feedback, mode-check feedback, round-summary stagger, and About dialog transitions, with fine-pointer hover gating and a reduced-motion path.
- 2026-07-20: Expanded roadside notes from 24 to 36 of 38 streets and added 12 sourced intersection notes covering casino history, parks, landmarks, public art, name origins, a ranch, and the city boundary. Jones and Ann remain uncovered rather than carrying weak filler; the other 146 intersections render no empty card.
