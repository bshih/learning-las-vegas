# Learning Las Vegas

A map game for learning the major streets and intersections of the Las Vegas Valley. Pick a mode, place a guess on an unlabeled map, and use the reveal to build a mental map of the city.

[Play Learning Las Vegas](https://lab.brianshih.com/learning-las-vegas/)

The app is static-first: there is no account, backend, live geocoder, or server-side progress store. Sessions and scores stay in the browser.

## Run locally

The current Vite toolchain requires Node.js `^20.19.0` or `>=22.12.0`.

```sh
npm ci
npm run dev
```

For a production build:

```sh
npm run build
npm run preview
```

## Make it your city

The reusable seams are deliberately small:

- `src/data/intersections.json` contains intersection prompts and coordinates.
- `src/data/streets.geojson` and `src/data/streetGroups.json` define playable street geometry and teaching groups.
- `src/data/areaBuckets.json` defines player-facing geographic filters.
- `src/map/` keeps rendering separate from game and scoring logic.
- `src/styles/` and `DESIGN.md` define the visual system.

Replace the Las Vegas data, adjust the map bounds and copy, then run the data validation and build commands. The game does not need a live geocoder at runtime.

## Validation

```sh
npm run test:learning
npm run validate:seed
npm run validate:streets
npm run build
```

Two additional geometry checks query public OpenStreetMap/Overpass services and therefore require network access:

```sh
npm run verify:seed:coords
npm run verify:streets:geometry
```

## Data and attribution

The interactive basemap is rendered with [MapLibre GL JS](https://maplibre.org/) using [OpenFreeMap](https://openfreemap.org/) and [OpenStreetMap](https://www.openstreetmap.org/copyright) data.

The checked-in street geometry is derived from OpenStreetMap. The geographic datasets in `src/data/` are offered under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/); see [DATA_LICENSE.md](DATA_LICENSE.md). Source links for editorial roadside notes are stored alongside those notes.

## License

Application code and original documentation are available under the [MIT License](LICENSE). Geographic data has separate terms described above.
