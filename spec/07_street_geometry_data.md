# Street Geometry And Learning Data

## Status

Pending review.

## Objective

Add a small, trustworthy, app-owned street dataset that can draw and score whole streets without making gameplay depend on the internal layer schema of the OpenFreeMap style.

## Source Of Truth

Add two static sources:

- `src/data/streets.geojson`: simplified `LineString` or `MultiLineString` geometry.
- `src/data/streetGroups.json`: curated relative-order and teaching metadata.

The basemap continues to come from OpenFreeMap. Game-owned street geometry renders as a separate MapLibre GeoJSON source and line/symbol layers.

Do not score against OpenFreeMap's internal vector source-layer names or filters. Those are third-party implementation details and may change independently of this app.

## Initial Corpus

The initial release contained 28 streets, selected for usefulness rather than completeness. A Henderson-focused expansion brings the current corpus to 32.

West-valley north-south group, ordered west-to-east:

1. Hualapai Way
2. Fort Apache Road
3. Durango Drive
4. Buffalo Drive
5. Rainbow Boulevard
6. Jones Boulevard
7. Decatur Boulevard

Central/east north-south group, ordered west-to-east:

1. Las Vegas Boulevard
2. Maryland Parkway
3. Eastern Avenue
4. Pecos Road
5. Lamb Boulevard
6. Nellis Boulevard

Valley east-west group, ordered north-to-south:

1. Ann Road
2. Craig Road
3. Cheyenne Avenue
4. Lake Mead Boulevard
5. Charleston Boulevard
6. Sahara Avenue
7. Flamingo Road
8. Tropicana Avenue
9. Sunset Road
10. Warm Springs Road

Drawn but initially excluded from simple ordered-neighbor claims because they curve, branch, change names, or are primarily regional:

- Rampart Boulevard
- Spring Mountain Road
- Paradise Road
- Green Valley Parkway
- Boulder Highway
- Stephanie Street
- St. Rose Parkway
- Horizon Ridge Parkway
- Lake Mead Parkway

Geometry review may move a street between groups, but removing or substituting a proposed street is a product-spec change to record in implementation notes. Do not block the first release on representing every road in every intersection prompt.

## Geometry Contract

Each GeoJSON feature has this shape:

```ts
type StreetGeometryProperties = {
  id: string;
  name: string;
};
```

Requirements:

- `id` is stable, lowercase kebab-case, and unique.
- Geometry is clipped to the playable Las Vegas valley bounds.
- Disconnected segments use `MultiLineString` rather than separate IDs when they represent the same player-facing street.
- Geometry follows the road sufficiently closely for valley-scale tap scoring.
- Geometry is simplified enough to remain a small static asset without visibly cutting across the road at normal gameplay zoom.
- Street naming transitions are represented intentionally. Do not merge roads solely because they connect physically if locals understand them as different named streets.

## Street Metadata Contract

```ts
type StreetAxis = "north-south" | "east-west" | "regional";

type StreetDefinition = {
  id: string;
  name: string;
  aliases: string[];
  axis: StreetAxis;
  areaIds: AreaBucketId[];
  difficulty: "easy" | "medium" | "hard";
  teachingNote: string;
};

type OrderedStreetGroup = {
  id: string;
  kind: "ordered";
  label: string;
  axis: Exclude<StreetAxis, "regional">;
  orderedDirection: "west-to-east" | "north-to-south";
  streetIds: string[];
};

type ShapeStreetGroup = {
  id: string;
  kind: "shape";
  label: string;
  axis: StreetAxis;
  streetIds: string[];
};

type StreetGroup = OrderedStreetGroup | ShapeStreetGroup;
```

Rules:

- A street may appear in more than one area but has one canonical ID.
- `aliases` covers alternate map/player names without changing the canonical prompt.
- `teachingNote` is one concrete, locally useful sentence; avoid generic filler.
- Ordered-group order is curated, not inferred from a single sample coordinate.
- A street may belong to more than one ordered learning group only when both orders remain unambiguous.
- Shape groups are fully playable teaching groups. They teach the road's path and area while omitting ordered-neighbor counts.

## Data Acquisition

- Source initial geometry from OpenStreetMap during development, not at runtime.
- Record acquisition date, source query, notable edits, naming decisions, and uncertainty in `src/data/street-notes.md`.
- Preserve required OpenStreetMap attribution in the map.
- Manually review each line against the rendered basemap.
- Commit the reviewed geometry so normal builds and gameplay are offline with respect to game data.

## Relationship With Intersections

- Street IDs connect to intersection `streetA`, `streetB`, and aliases through a normalized lookup.
- Do not replace stable intersection IDs or coordinates.
- A validation error is raised when a street name claims a canonical match but normalization is ambiguous.
- Existing intersections without matching street geometry remain playable in intersection mode.
- Street geometry may support feedback, but V1 does not expose hints.

## Validation

Add an offline `npm run validate:streets` command. It validates:

- Valid GeoJSON and supported geometry types.
- Unique IDs and exact metadata/geometry ID parity.
- Coordinates within or immediately adjacent to playable bounds.
- Finite coordinates and non-degenerate lines.
- Allowed axes, difficulty values, and area IDs.
- Valid group references and no duplicate street IDs within a group.
- At least 5 streets in every exposed group.
- Canonical/alias normalization without collisions.
- Required initial anchor coverage.

Add a separate network-backed geometry verifier if practical. It must remain separate from the build, like `verify:seed:coords`, and network outages must be reported separately from data failures.

## Acceptance

- Every initial street can be highlighted as one visually coherent route.
- Ordered groups read correctly on the rendered Vegas map.
- All curved and regional roads are selectable in the special-shape group rather than silently filtered out.
- Local GeoJSON renders above the basemap without obscuring required context.
- Normal gameplay makes no live request for street geometry.
- Static validation catches broken IDs, groups, aliases, and geometry.
- The checked-in asset is small enough that it does not materially delay first map interaction on mobile.
