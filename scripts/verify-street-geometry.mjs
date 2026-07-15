import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const geometry = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "streets.geojson"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "streetGroups.json"), "utf8"));
const overpassUrl = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const maxDistanceMeters = parseMaxDistance(process.argv.slice(2));
const allowedHighways = new Set(["trunk", "primary", "secondary", "tertiary", "unclassified", "residential"]);
const canonicalByNormalizedName = new Map(catalog.streets.map((street) => [normalizeOsmName(street.name), street]));
const pattern = catalog.streets.map((street) => escapeRegExp(street.name)).join("|");
const query = `[out:json][timeout:90];
way(35.9,-115.45,36.38,-114.9)["highway"]["name"~"^(North |South |East |West )?(${pattern})$",i];
out tags geom;`;

const response = await fetch(overpassUrl, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "melissa-map-street-geometry-verifier/0.1"
  },
  body: new URLSearchParams({ data: query })
});

if (!response.ok) throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);
const osm = await response.json();
const osmSegmentsById = new Map(catalog.streets.map((street) => [street.id, []]));

for (const element of osm.elements) {
  if (
    element.type !== "way" ||
    !Array.isArray(element.geometry) ||
    !allowedHighways.has(element.tags?.highway)
  ) continue;
  const street = canonicalByNormalizedName.get(normalizeOsmName(element.tags?.name));
  if (!street) continue;
  const segments = osmSegmentsById.get(street.id);
  for (let index = 1; index < element.geometry.length; index += 1) {
    segments.push([
      [element.geometry[index - 1].lon, element.geometry[index - 1].lat],
      [element.geometry[index].lon, element.geometry[index].lat]
    ]);
  }
}

const failures = [];
for (const feature of geometry.features) {
  const segments = osmSegmentsById.get(feature.properties.id) || [];
  if (segments.length === 0) {
    failures.push(`${feature.properties.id}: no current OSM geometry found`);
    continue;
  }
  const lines = feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const samples = lines.flatMap((line) => sampleLine(line));
  let farthest = { distance: 0, coordinate: undefined };
  for (const coordinate of samples) {
    const distance = Math.min(...segments.map((segment) => pointToSegmentMeters(coordinate, segment)));
    if (distance > farthest.distance) farthest = { distance, coordinate };
  }
  if (farthest.distance > maxDistanceMeters) {
    failures.push(
      `${feature.properties.id}: sampled point ${farthest.coordinate.join(",")} is ${Math.round(farthest.distance)}m from current OSM geometry`
    );
  } else {
    console.log(`${feature.properties.id}: ok (maximum sampled offset ${Math.round(farthest.distance)}m)`);
  }
}

if (failures.length > 0) {
  console.error(`Street geometry verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Street geometry verification passed: ${geometry.features.length} streets within ${maxDistanceMeters}m of current OSM geometry.`);

function sampleLine(line) {
  if (line.length <= 3) return line;
  const samples = [];
  const step = Math.max(1, Math.floor((line.length - 1) / 3));
  for (let index = 0; index < line.length; index += step) samples.push(line[index]);
  if (samples.at(-1) !== line.at(-1)) samples.push(line.at(-1));
  return samples;
}

function pointToSegmentMeters(point, [start, end]) {
  const projectedPoint = project(point);
  const projectedStart = project(start);
  const projectedEnd = project(end);
  const dx = projectedEnd[0] - projectedStart[0];
  const dy = projectedEnd[1] - projectedStart[1];
  if (dx === 0 && dy === 0) return Math.hypot(projectedPoint[0] - projectedStart[0], projectedPoint[1] - projectedStart[1]);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((projectedPoint[0] - projectedStart[0]) * dx + (projectedPoint[1] - projectedStart[1]) * dy) /
        (dx * dx + dy * dy)
    )
  );
  return Math.hypot(
    projectedPoint[0] - (projectedStart[0] + t * dx),
    projectedPoint[1] - (projectedStart[1] + t * dy)
  );
}

function project([lon, lat]) {
  const radians = Math.PI / 180;
  return [lon * 111_320 * Math.cos(36.15 * radians), lat * 110_540];
}

function normalizeOsmName(value) {
  return String(value || "").replace(/^(north|south|east|west)\s+/i, "").toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMaxDistance(args) {
  const argument = args.find((value) => value.startsWith("--max-distance-m="));
  const value = argument ? Number(argument.slice("--max-distance-m=".length)) : 75;
  if (!Number.isFinite(value) || value <= 0) throw new Error("--max-distance-m must be a positive number.");
  return value;
}
