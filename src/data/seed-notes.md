# Seed Corpus Notes

## Summary

- Seed count: 76 intersections.
- Goal: playable V1 coverage across the Las Vegas valley, not survey-grade cartography.
- Data format: `src/data/intersections.json` with stable ids, street names, approximate coordinates, region tags, difficulty, aliases, and selective teaching notes. Normalized area buckets are derived from region tags in `src/data/areaBuckets.json`.

## Method

- Started with major Las Vegas arterial grid anchors from the V1 spec.
- Chose high-confidence intersections that are useful for learning west/east and north/south ordering.
- Coordinates are hand-curated approximate center points from the known arterial grid and regional anchors. They should be refined against open/public map references before tightening score thresholds.
- No live geocoding calls should be needed by the app at runtime.

## Coverage

- East/west anchors: Sahara, Charleston, Flamingo, Tropicana, Spring Mountain, Lake Mead, Sunset, Warm Springs, Blue Diamond.
- North/south anchors: Rainbow, Decatur, Jones, Buffalo, Durango, Fort Apache, Las Vegas Boulevard, Eastern, Maryland, Lamb, Nellis.
- Regional anchors: Strip, airport/South Strip, Summerlin, Henderson/Green Valley, North Las Vegas, northwest Las Vegas.
- Player-facing area buckets are normalized from descriptive regions. Each exposed bucket has at least 10 intersections.

## Sources And Restrictions

- OpenStreetMap and public civic/GIS map viewers are the intended reference class for the next manual QA pass.
- Google Maps content was not scraped or used as a corpus source.
- The current set intentionally avoids bulk calls to Nominatim or other public geocoding APIs.
- The 2026-07-04 Henderson and North/Northwest top-up rows were checked against OpenStreetMap road geometry through the existing Overpass verifier.

## Known Uncertainty

- `spring-mountain-paradise`: Spring Mountain/Sands/Paradise geometry is less grid-clean near the convention corridor; good enough for a learning prompt but should be refined in a future QA pass.
- `henderson-st-rose-eastern`: St. Rose Parkway runs diagonally and the coordinate should be treated as approximate.
- Summerlin points on Rampart/Hualapai and west-side Fort Apache/Durango points use approximate arterial centerline intersections.
- Some older North Las Vegas points on Craig/Cheyenne/Lamb/Nellis use approximate arterial grid centers; useful for V1 ordering but still candidates for future precision QA.

## Future QA Pass

- Add a reviewed flag or `accuracy` field if future gameplay needs tighter scoring.
- Compare every point against an OSM/Clark County road-centerline export before expanding beyond 100 intersections.
- Consider ETL later, but keep this hand-curated set as a stable regression fixture.
