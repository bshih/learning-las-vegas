import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const geometryPath = path.join(root, "src", "data", "streets.geojson");
const catalogPath = path.join(root, "src", "data", "streetGroups.json");
const areaBucketsPath = path.join(root, "src", "data", "areaBuckets.json");
const intersectionsPath = path.join(root, "src", "data", "intersections.json");

const geometry = readJson(geometryPath);
const catalog = readJson(catalogPath);
const areaBuckets = readJson(areaBucketsPath);
const intersections = readJson(intersectionsPath);
const errors = [];

const supportedGeometryTypes = new Set(["LineString", "MultiLineString"]);
const allowedAxes = new Set(["north-south", "east-west", "regional"]);
const allowedDifficulties = new Set(["easy", "medium", "hard"]);
const allowedAreaIds = new Set(areaBuckets.map((bucket) => bucket.id));
const paddedBounds = { minLat: 35.89, maxLat: 36.39, minLon: -115.46, maxLon: -114.89 };
const requiredOrderedGroups = {
  "west-valley-north-south": [
    "hualapai-way",
    "fort-apache-road",
    "durango-drive",
    "buffalo-drive",
    "rainbow-boulevard",
    "jones-boulevard",
    "decatur-boulevard"
  ],
  "central-east-north-south": [
    "las-vegas-boulevard",
    "maryland-parkway",
    "eastern-avenue",
    "pecos-road",
    "lamb-boulevard",
    "nellis-boulevard"
  ],
  "valley-east-west": [
    "ann-road",
    "craig-road",
    "cheyenne-avenue",
    "lake-mead-boulevard",
    "charleston-boulevard",
    "sahara-avenue",
    "flamingo-road",
    "tropicana-avenue",
    "sunset-road",
    "warm-springs-road"
  ]
};
const requiredShapeIds = [
  "rampart-boulevard",
  "spring-mountain-road",
  "paradise-road",
  "green-valley-parkway",
  "boulder-highway",
  "stephanie-street",
  "st-rose-parkway",
  "horizon-ridge-parkway",
  "lake-mead-parkway"
];
const requiredCanonicalNames = [
  "Hualapai Way",
  "Fort Apache Road",
  "Durango Drive",
  "Buffalo Drive",
  "Rainbow Boulevard",
  "Jones Boulevard",
  "Decatur Boulevard",
  "Las Vegas Boulevard",
  "Maryland Parkway",
  "Eastern Avenue",
  "Pecos Road",
  "Lamb Boulevard",
  "Nellis Boulevard",
  "Ann Road",
  "Craig Road",
  "Cheyenne Avenue",
  "Lake Mead Boulevard",
  "Charleston Boulevard",
  "Sahara Avenue",
  "Flamingo Road",
  "Tropicana Avenue",
  "Sunset Road",
  "Warm Springs Road",
  "Rampart Boulevard",
  "Spring Mountain Road",
  "Paradise Road",
  "Green Valley Parkway",
  "Boulder Highway",
  "Stephanie Street",
  "St. Rose Parkway",
  "Horizon Ridge Parkway",
  "Lake Mead Parkway"
];
const requiredStreetIds = new Set([
  ...Object.values(requiredOrderedGroups).flat(),
  ...requiredShapeIds
]);

if (geometry?.type !== "FeatureCollection" || !Array.isArray(geometry.features)) {
  errors.push("streets.geojson must be a GeoJSON FeatureCollection.");
}
if (!catalog || !Array.isArray(catalog.streets) || !Array.isArray(catalog.groups)) {
  errors.push("streetGroups.json must contain streets and groups arrays.");
}

const features = Array.isArray(geometry?.features) ? geometry.features : [];
const streets = Array.isArray(catalog?.streets) ? catalog.streets : [];
const groups = Array.isArray(catalog?.groups) ? catalog.groups : [];
const featureIds = new Set();
const definitionIds = new Set();
const groupIds = new Set();
const namesByNormalizedValue = new Map();

for (const feature of features) validateFeature(feature);
for (const street of streets) validateStreet(street);
for (const group of groups) validateGroup(group);

if (features.length !== requiredCanonicalNames.length) {
  errors.push(`expected ${requiredCanonicalNames.length} geometry features, found ${features.length}`);
}
if (streets.length !== requiredCanonicalNames.length) {
  errors.push(`expected ${requiredCanonicalNames.length} street definitions, found ${streets.length}`);
}
const canonicalNames = new Set(streets.map((street) => street.name));
for (const name of requiredCanonicalNames) {
  if (!canonicalNames.has(name)) errors.push(`missing required canonical street name: ${name}`);
}
for (const name of canonicalNames) {
  if (!requiredCanonicalNames.includes(name)) errors.push(`unexpected canonical street name: ${name}`);
}

for (const id of requiredStreetIds) {
  if (!featureIds.has(id)) errors.push(`missing required geometry anchor: ${id}`);
  if (!definitionIds.has(id)) errors.push(`missing required street definition: ${id}`);
}
for (const id of featureIds) {
  if (!definitionIds.has(id)) errors.push(`${id}: geometry has no metadata definition`);
}
for (const id of definitionIds) {
  if (!featureIds.has(id)) errors.push(`${id}: metadata has no geometry feature`);
}

for (const feature of features) {
  const definition = streets.find((street) => street.id === feature?.properties?.id);
  if (definition && feature.properties.name !== definition.name) {
    errors.push(`${definition.id}: geometry name does not exactly match metadata name`);
  }
}

for (const [groupId, expectedOrder] of Object.entries(requiredOrderedGroups)) {
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    errors.push(`missing required ordered group: ${groupId}`);
  } else if (JSON.stringify(group.streetIds) !== JSON.stringify(expectedOrder)) {
    errors.push(`${groupId}: curated street order changed`);
  }
}

const shapeGroup = groups.find((group) => group.id === "special-shapes");
if (!shapeGroup || shapeGroup.kind !== "shape") {
  errors.push("missing required special-shapes shape group");
} else if (JSON.stringify(shapeGroup.streetIds) !== JSON.stringify(requiredShapeIds)) {
  errors.push("special-shapes: curated regional-road set changed");
}

for (const item of intersections) {
  for (const name of [item.streetA, item.streetB]) {
    const normalized = normalizeStreetName(name);
    const matches = streets.filter((street) =>
      [street.name, ...street.aliases].some((candidate) => normalizeStreetName(candidate) === normalized)
    );
    if (matches.length > 1) {
      errors.push(`${item.id}: ${name} ambiguously matches ${matches.map((street) => street.id).join(", ")}`);
    }
  }
}

const assetBytes = fs.statSync(geometryPath).size;
if (assetBytes > 500_000) {
  errors.push(`streets.geojson is ${assetBytes} bytes; expected a mobile-safe asset at or below 500000 bytes`);
}

if (errors.length > 0) {
  console.error(`Street data validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const lineCount = features.reduce((count, feature) => count + getLines(feature.geometry).length, 0);
const pointCount = features.reduce(
  (count, feature) => count + getLines(feature.geometry).reduce((sum, line) => sum + line.length, 0),
  0
);
console.log(`Street data validation passed: ${streets.length} streets in ${groups.length} groups.`);
console.log(`Geometry: ${lineCount} line(s), ${pointCount} points, ${assetBytes} bytes.`);
console.log(`Special-shape focus group: ${shapeGroup.streetIds.join(", ")}.`);

function validateFeature(feature) {
  const id = feature?.properties?.id;
  const label = typeof id === "string" ? id : "unknown feature";
  if (feature?.type !== "Feature") errors.push(`${label}: type must be Feature`);
  if (!isKebabId(id)) errors.push(`${label}: id must be lowercase kebab-case`);
  if (featureIds.has(id)) errors.push(`${label}: duplicate geometry id`);
  featureIds.add(id);
  if (typeof feature?.properties?.name !== "string" || feature.properties.name.trim() === "") {
    errors.push(`${label}: missing geometry name`);
  }
  if (!supportedGeometryTypes.has(feature?.geometry?.type)) {
    errors.push(`${label}: unsupported geometry type ${feature?.geometry?.type}`);
    return;
  }
  const lines = getLines(feature.geometry);
  if (lines.length === 0) errors.push(`${label}: geometry contains no lines`);
  for (const [lineIndex, line] of lines.entries()) {
    if (!Array.isArray(line) || line.length < 2) {
      errors.push(`${label}: line ${lineIndex} must contain at least two coordinates`);
      continue;
    }
    let lengthMeters = 0;
    for (const [pointIndex, coordinate] of line.entries()) {
      if (
        !Array.isArray(coordinate) ||
        coordinate.length < 2 ||
        !Number.isFinite(coordinate[0]) ||
        !Number.isFinite(coordinate[1])
      ) {
        errors.push(`${label}: line ${lineIndex} point ${pointIndex} is not a finite [lon, lat] coordinate`);
        continue;
      }
      const [lon, lat] = coordinate;
      if (
        lat < paddedBounds.minLat ||
        lat > paddedBounds.maxLat ||
        lon < paddedBounds.minLon ||
        lon > paddedBounds.maxLon
      ) {
        errors.push(`${label}: line ${lineIndex} point ${pointIndex} is outside playable bounds`);
      }
      if (pointIndex > 0) lengthMeters += haversineMeters(line[pointIndex - 1], coordinate);
    }
    if (lengthMeters < 25) errors.push(`${label}: line ${lineIndex} is degenerate (${lengthMeters.toFixed(1)}m)`);
  }
}

function validateStreet(street) {
  const id = street?.id;
  const label = typeof id === "string" ? id : "unknown street";
  if (!isKebabId(id)) errors.push(`${label}: id must be lowercase kebab-case`);
  if (definitionIds.has(id)) errors.push(`${label}: duplicate street definition id`);
  definitionIds.add(id);
  if (typeof street?.name !== "string" || street.name.trim() === "") errors.push(`${label}: missing name`);
  if (!Array.isArray(street?.aliases)) {
    errors.push(`${label}: aliases must be an array`);
  } else {
    for (const value of [street.name, ...street.aliases]) {
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`${label}: canonical name and aliases must be non-empty strings`);
        continue;
      }
      const normalized = normalizeStreetName(value);
      const owner = namesByNormalizedValue.get(normalized);
      if (owner && owner !== id) errors.push(`${label}: normalized name ${normalized} collides with ${owner}`);
      namesByNormalizedValue.set(normalized, id);
    }
  }
  if (!allowedAxes.has(street?.axis)) errors.push(`${label}: invalid axis ${street?.axis}`);
  if (!allowedDifficulties.has(street?.difficulty)) errors.push(`${label}: invalid difficulty ${street?.difficulty}`);
  if (!Array.isArray(street?.areaIds) || street.areaIds.length === 0) {
    errors.push(`${label}: areaIds must be a non-empty array`);
  } else {
    const uniqueAreas = new Set(street.areaIds);
    if (uniqueAreas.size !== street.areaIds.length) errors.push(`${label}: duplicate area id`);
    for (const areaId of street.areaIds) {
      if (!allowedAreaIds.has(areaId)) errors.push(`${label}: invalid area id ${areaId}`);
    }
  }
  if (typeof street?.teachingNote !== "string" || !/[.!?]$/.test(street.teachingNote.trim())) {
    errors.push(`${label}: teachingNote must be one non-empty sentence ending in punctuation`);
  }
}

function validateGroup(group) {
  const id = group?.id;
  const label = typeof id === "string" ? id : "unknown group";
  if (!isKebabId(id)) errors.push(`${label}: group id must be lowercase kebab-case`);
  if (groupIds.has(id)) errors.push(`${label}: duplicate group id`);
  groupIds.add(id);
  if (typeof group?.label !== "string" || group.label.trim() === "") errors.push(`${label}: missing label`);
  if (!Array.isArray(group?.streetIds) || group.streetIds.length < 5) {
    errors.push(`${label}: every exposed group must contain at least 5 streets`);
    return;
  }
  if (new Set(group.streetIds).size !== group.streetIds.length) errors.push(`${label}: duplicate street id`);
  for (const streetId of group.streetIds) {
    if (!definitionIds.has(streetId)) errors.push(`${label}: unknown street reference ${streetId}`);
  }
  if (group.kind === "ordered") {
    if (!new Set(["north-south", "east-west"]).has(group.axis)) errors.push(`${label}: invalid ordered axis`);
    if (!new Set(["west-to-east", "north-to-south"]).has(group.orderedDirection)) {
      errors.push(`${label}: invalid ordered direction`);
    }
    const expectedDirection = group.axis === "north-south" ? "west-to-east" : "north-to-south";
    if (group.orderedDirection !== expectedDirection) errors.push(`${label}: axis and orderedDirection disagree`);
    for (const streetId of group.streetIds) {
      const street = streets.find((candidate) => candidate.id === streetId);
      if (street && street.axis !== group.axis) errors.push(`${label}: ${streetId} has incompatible axis ${street.axis}`);
    }
  } else if (group.kind === "shape") {
    if (!allowedAxes.has(group.axis)) errors.push(`${label}: invalid shape axis ${group.axis}`);
    if (group.streetIds.length < 5) errors.push(`${label}: shape groups require at least 5 streets`);
    if ("orderedDirection" in group) errors.push(`${label}: shape groups must not claim an ordered direction`);
  } else {
    errors.push(`${label}: invalid group kind ${group.kind}`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Unable to read ${path.relative(root, filePath)}: ${error.message}`);
    process.exit(1);
  }
}

function getLines(value) {
  if (value?.type === "LineString") return [value.coordinates];
  if (value?.type === "MultiLineString") return value.coordinates;
  return [];
}

function isKebabId(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function normalizeStreetName(value) {
  const suffixes = { ave: "avenue", blvd: "boulevard", dr: "drive", hwy: "highway", pkwy: "parkway", rd: "road" };
  const words = String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (["north", "south", "east", "west"].includes(words[0])) words.shift();
  if (words.length > 0) words[words.length - 1] = suffixes[words.at(-1)] || words.at(-1);
  return words.join(" ");
}

function haversineMeters([lonA, latA], [lonB, latB]) {
  const radius = 6_371_008.8;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
