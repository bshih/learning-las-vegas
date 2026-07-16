import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const geometryPath = path.join(root, "src", "data", "streets.geojson");
const catalogPath = path.join(root, "src", "data", "streetGroups.json");
const geometry = JSON.parse(fs.readFileSync(geometryPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const requestedIds = new Set(process.argv.slice(2));
const requestedStreets = catalog.streets.filter(
  (street) => requestedIds.has(street.id),
);

if (requestedIds.size === 0) throw new Error("Pass one or more street ids to add.");

const unresolvedIds = [...requestedIds].filter(
  (id) => !catalog.streets.some((street) => street.id === id),
);
if (unresolvedIds.length > 0) throw new Error(`Unknown street ids: ${unresolvedIds.join(", ")}`);

const overpassUrl = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const allowedHighways = new Set(["trunk", "primary", "secondary", "tertiary", "unclassified", "residential"]);
const bounds = { south: 35.89, west: -115.46, north: 36.39, east: -114.89 };
const canonicalByName = new Map(
  requestedStreets.flatMap((street) =>
    [street.name, ...street.aliases].map((name) => [normalizeName(name), street]),
  ),
);
const pattern = requestedStreets
  .flatMap((street) => [street.name, ...street.aliases])
  .map(escapeRegExp)
  .join("|");
const query = `[out:json][timeout:90];
way(35.9,-115.45,36.38,-114.9)["highway"]["name"~"^(North |South |East |West )?(${pattern})$",i];
out tags geom;`;

const response = await fetch(overpassUrl, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "learning-las-vegas-street-geometry-importer/0.1",
  },
  body: new URLSearchParams({ data: query }),
});
if (!response.ok) throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);

const osm = await response.json();
const linesById = new Map(requestedStreets.map((street) => [street.id, []]));
for (const element of osm.elements) {
  if (
    element.type !== "way" ||
    !Array.isArray(element.geometry) ||
    !allowedHighways.has(element.tags?.highway)
  ) continue;
  const street = canonicalByName.get(normalizeName(element.tags?.name));
  if (!street) continue;
  const coordinates = element.geometry.map(({ lon, lat }) => [lon, lat]);
  for (const line of splitToBounds(coordinates)) {
    const simplified = simplify(line, 12);
    if (simplified.length >= 2 && lineLengthMeters(simplified) >= 25) {
      linesById.get(street.id).push(simplified);
    }
  }
}

geometry.features = geometry.features.filter(
  (feature) => !requestedIds.has(feature.properties.id),
);
for (const street of requestedStreets) {
  const lines = linesById.get(street.id);
  if (!lines?.length) throw new Error(`No usable OSM geometry found for ${street.name}.`);
  geometry.features.push({
    type: "Feature",
    properties: { id: street.id, name: street.name },
    geometry: lines.length === 1
      ? { type: "LineString", coordinates: lines[0] }
      : { type: "MultiLineString", coordinates: lines },
  });
  console.log(`${street.id}: added ${lines.length} line(s)`);
}

fs.writeFileSync(geometryPath, `${JSON.stringify(geometry, null, 2)}\n`);

function splitToBounds(coordinates) {
  const lines = [];
  let current = [];
  for (const coordinate of coordinates) {
    if (inBounds(coordinate)) {
      current.push(coordinate);
    } else if (current.length > 0) {
      if (current.length >= 2) lines.push(current);
      current = [];
    }
  }
  if (current.length >= 2) lines.push(current);
  return lines;
}

function inBounds([lon, lat]) {
  return lon >= bounds.west && lon <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

function simplify(points, toleranceMeters) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop();
    let maxDistance = 0;
    let maxIndex = -1;
    for (let index = start + 1; index < end; index += 1) {
      const distance = pointToSegmentMeters(points[index], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = index;
      }
    }
    if (maxDistance > toleranceMeters && maxIndex > start) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

function pointToSegmentMeters(point, start, end) {
  const [px, py] = project(point);
  const [ax, ay] = project(start);
  const [bx, by] = project(end);
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function lineLengthMeters(line) {
  let length = 0;
  for (let index = 1; index < line.length; index += 1) {
    const [ax, ay] = project(line[index - 1]);
    const [bx, by] = project(line[index]);
    length += Math.hypot(bx - ax, by - ay);
  }
  return length;
}

function project([lon, lat]) {
  const radians = Math.PI / 180;
  return [lon * 111_320 * Math.cos(36.15 * radians), lat * 110_540];
}

function normalizeName(value) {
  return String(value || "").replace(/^(north|south|east|west)\s+/i, "").toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
