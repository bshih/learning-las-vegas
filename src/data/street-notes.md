# Street Geometry Notes

## Corpus

- Corpus size: 32 streets from `spec/07_street_geometry_data.md`.
- Static geometry: `src/data/streets.geojson` is the app-owned runtime source. Normal play does not request street geometry.
- Teaching data: `src/data/streetGroups.json` contains canonical names, aliases, areas, difficulty, notes, and the three ordered groups plus the regional special-shape group.
- Intended accuracy: valley-scale highlighting and tap scoring, not survey-grade centerlines or turn-by-turn routing.

## OpenStreetMap Acquisition

- Acquired: 2026-07-14 America/Los_Angeles (OSM snapshot timestamp `2026-07-15T01:24:34Z`).
- Source: OpenStreetMap contributors, retrieved from the public Overpass API.
- License: Open Database License (ODbL). The map UI must keep visible OpenStreetMap attribution when this data is displayed.
- Query bounds: south `35.9`, west `-115.45`, north `36.38`, east `-114.9`.
- Query shape:

```overpass
[out:json][timeout:90];
way(35.9,-115.45,36.38,-114.9)
  ["highway"]
  ["name"~"^(North |South |East |West )?(Hualapai Way|Fort Apache Road|Durango Drive|Buffalo Drive|Rainbow Boulevard|Jones Boulevard|Decatur Boulevard|Las Vegas Boulevard|Maryland Parkway|Eastern Avenue|Pecos Road|Lamb Boulevard|Nellis Boulevard|Ann Road|Craig Road|Cheyenne Avenue|Lake Mead Boulevard|Charleston Boulevard|Sahara Avenue|Flamingo Road|Tropicana Avenue|Sunset Road|Warm Springs Road|Rampart Boulevard|Spring Mountain Road|Paradise Road|Green Valley Parkway|Boulder Highway|Stephanie Street|St\\.? Rose Parkway|Horizon Ridge Parkway|Lake Mead Parkway)$",i];
out tags geom;
```

The checked-in asset retains named `trunk`, `primary`, `secondary`, `tertiary`, `unclassified`, and `residential` ways. Construction, proposed, service, track, link, and bridleway geometry is excluded. Directional OSM prefixes are normalized to the canonical player-facing name.

## Review And Simplification

- Source ways were clipped to the playable bounds with a `0.01` degree review margin.
- OSM segments sharing exact endpoints were stitched where the endpoint had one unambiguous continuation.
- Lines were simplified with a 12 m Douglas-Peucker tolerance. This preserves visible curves at normal play zoom while keeping the GeoJSON under 300 KB.
- Dual carriageways, divided-road transitions, and genuinely disconnected named segments remain separate lines inside one `MultiLineString`; they are not assigned separate player-facing IDs.
- The initial 28 routes were reviewed together over an OpenStreetMap raster basemap on 2026-07-14. Stephanie Street, St. Rose Parkway, Horizon Ridge Parkway, and Lake Mead Parkway were added from current OSM geometry on 2026-07-15 to strengthen Henderson coverage and are included in the same regional comparison group.

## Naming Decisions

- Directional prefixes such as `North Decatur Boulevard` normalize to `Decatur Boulevard`; they do not create separate streets.
- Common suffix abbreviations (`Rd`, `Ave`, `Blvd`, `Dr`, `Pkwy`, and `Hwy`) are explicit aliases and normalize to their full canonical suffixes.
- `Spring Mountain Road` includes only OSM ways carrying that name. The connected Sands Avenue corridor is intentionally excluded rather than silently merged.
- `Lake Mead Boulevard` does not absorb Lake Mead Parkway.
- The special-shape group also includes `Stephanie Street`, `St. Rose Parkway`, `Horizon Ridge Parkway`, and `Lake Mead Parkway`. The group carries no total-order claim.

## Known Uncertainty

- The source preserves short gaps where OSM has disconnected same-name segments, divided-road transitions, or a naming transition. Scoring should treat every component in the feature as the same canonical street.
- Parallel carriageways can produce two nearby selectable lines. At valley-scale scoring distances this is preferable to inventing a synthetic centerline.
- `Spring Mountain Road` stops at its documented naming transition rather than continuing east as Sands Avenue.
- Boulder Highway and Las Vegas Boulevard extend toward the edge of the broad playable bounds. Future product framing may choose a tighter camera frame, but the geometry is not clipped to an invented urban boundary.
- Area membership is teaching metadata, not a claim that every component of a street lies only inside those buckets.
- Re-run the network verifier before tightening geometry-distance tolerances; OSM may evolve after the recorded snapshot.
