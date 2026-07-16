import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "src", "data", "intersections.json");
const areaBucketsPath = path.join(root, "src", "data", "areaBuckets.json");
const raw = fs.readFileSync(dataPath, "utf8");
const intersections = JSON.parse(raw);
const areaBuckets = JSON.parse(fs.readFileSync(areaBucketsPath, "utf8"));

const bounds = {
  minLat: 35.9,
  maxLat: 36.38,
  minLon: -115.45,
  maxLon: -114.9
};
const difficulties = new Set(["easy", "medium", "hard"]);
const minAreaBucketSize = 18;
const requiredStrings = ["id", "streetA", "streetB", "region", "difficulty"];
const requiredAnchors = [
  "Sahara Avenue",
  "Charleston Boulevard",
  "Flamingo Road",
  "Tropicana Avenue",
  "Spring Mountain Road",
  "Rainbow Boulevard",
  "Decatur Boulevard",
  "Jones Boulevard",
  "Buffalo Drive",
  "Durango Drive",
  "Fort Apache Road",
  "Eastern Avenue",
  "Maryland Parkway",
  "Lamb Boulevard",
  "Nellis Boulevard"
];
const coordinateQaChecks = [
  {
    id: "sahara-nellis",
    expected: { lat: 36.1443, lon: -115.0654 },
    maxDelta: 0.002,
    note: "should mark South Nellis Boulevard at East Sahara Avenue"
  },
  {
    id: "charleston-fort-apache",
    expected: { lat: 36.159, lon: -115.2915 },
    maxDelta: 0.002,
    note: "should mark South Fort Apache Road at West Charleston Boulevard"
  },
  {
    id: "tropicana-paradise",
    expected: { lat: 36.101, lon: -115.1498 },
    maxDelta: 0.002,
    note: "should mark Paradise Road at East Tropicana Avenue"
  },
  {
    id: "spring-mountain-paradise",
    expected: { lat: 36.1213, lon: -115.1551 },
    maxDelta: 0.002,
    note: "should use the OSM-verified Sands Avenue crossing east of the Strip"
  },
  {
    id: "summerlin-lake-mead-rampart",
    expected: { lat: 36.1998, lon: -115.2824 },
    maxDelta: 0.002,
    note: "should mark North Rampart Boulevard, not the west-side Lake Mead corridor"
  },
  {
    id: "henderson-lake-mead-boulder-hwy",
    expected: { lat: 36.0396, lon: -114.982 },
    maxDelta: 0.002,
    note: "should mark Boulder Highway at East Lake Mead Parkway"
  },
  {
    id: "north-las-vegas-lake-mead-las-vegas-blvd",
    expected: { lat: 36.1958, lon: -115.129 },
    maxDelta: 0.002,
    note: "should mark North Las Vegas Boulevard, not the I-15/Lake Mead interchange"
  },
  {
    id: "henderson-st-rose-eastern",
    expected: { lat: 36.0071, lon: -115.1143 },
    maxDelta: 0.002,
    note: "should mark South Eastern Avenue at Saint Rose Parkway"
  },
  {
    id: "north-las-vegas-craig-mlk",
    expected: { lat: 36.2394, lon: -115.162 },
    maxDelta: 0.002,
    note: "should mark North Martin Luther King Junior Boulevard at West Craig Road"
  },
  {
    id: "southwest-rainbow-blue-diamond",
    expected: { lat: 36.0224, lon: -115.2435 },
    maxDelta: 0.002,
    note: "should mark South Rainbow Boulevard at Blue Diamond Road"
  },
  {
    id: "henderson-warm-springs-green-valley",
    expected: { lat: 36.05653, lon: -115.08415 },
    maxDelta: 0.002,
    note: "should mark Green Valley Parkway at Warm Springs Road"
  },
  {
    id: "henderson-sunset-stephanie",
    expected: { lat: 36.06377, lon: -115.04627 },
    maxDelta: 0.002,
    note: "should mark Stephanie Street at Sunset Road"
  },
  {
    id: "henderson-sunset-boulder-hwy",
    expected: { lat: 36.06595, lon: -115.01142 },
    maxDelta: 0.002,
    note: "should mark Boulder Highway at Sunset Road"
  },
  {
    id: "henderson-horizon-ridge-eastern",
    expected: { lat: 35.99931, lon: -115.10473 },
    maxDelta: 0.002,
    note: "should mark Eastern Avenue at Horizon Ridge Parkway"
  },
  {
    id: "north-las-vegas-cheyenne-mlk",
    expected: { lat: 36.21776, lon: -115.16134 },
    maxDelta: 0.002,
    note: "should mark Martin Luther King Boulevard at Cheyenne Avenue"
  },
  {
    id: "northwest-lone-mountain-decatur",
    expected: { lat: 36.24673, lon: -115.20746 },
    maxDelta: 0.002,
    note: "should mark Decatur Boulevard at Lone Mountain Road"
  }
];
const ids = new Set();
const areaBucketIds = new Set();
const areaCounts = new Map();
const coveredStreets = new Set();
const errors = [];

if (!Array.isArray(intersections)) {
  errors.push("Seed data must be a JSON array.");
}

if (!Array.isArray(areaBuckets)) {
  errors.push("Area buckets must be a JSON array.");
} else {
  for (const bucket of areaBuckets) {
    if (!bucket || typeof bucket.id !== "string" || bucket.id.trim() === "") {
      errors.push("Area bucket missing id.");
      continue;
    }

    if (areaBucketIds.has(bucket.id)) {
      errors.push(`${bucket.id}: duplicate area bucket id`);
    }
    areaBucketIds.add(bucket.id);

    if (typeof bucket.label !== "string" || bucket.label.trim() === "") {
      errors.push(`${bucket.id}: missing area bucket label`);
    }

    if (
      !Array.isArray(bucket.patterns) ||
      bucket.patterns.length === 0 ||
      bucket.patterns.some((pattern) => typeof pattern !== "string" || pattern.trim() === "")
    ) {
      errors.push(`${bucket.id}: area bucket must include non-empty region patterns`);
    }
  }
}

for (const [index, item] of intersections.entries()) {
  const label = item && item.id ? item.id : `row ${index}`;

  for (const key of requiredStrings) {
    if (!item || typeof item[key] !== "string" || item[key].trim() === "") {
      errors.push(`${label}: missing non-empty string ${key}`);
    }
  }

  if (typeof item.streetA === "string") coveredStreets.add(item.streetA);
  if (typeof item.streetB === "string") coveredStreets.add(item.streetB);

  if (ids.has(item.id)) {
    errors.push(`${label}: duplicate id`);
  }
  ids.add(item.id);

  if (typeof item.lat !== "number" || item.lat < bounds.minLat || item.lat > bounds.maxLat) {
    errors.push(`${label}: lat outside Las Vegas bounds`);
  }

  if (typeof item.lon !== "number" || item.lon < bounds.minLon || item.lon > bounds.maxLon) {
    errors.push(`${label}: lon outside Las Vegas bounds`);
  }

  if (!difficulties.has(item.difficulty)) {
    errors.push(`${label}: invalid difficulty ${item.difficulty}`);
  }

  if (item.area !== undefined && !areaBucketIds.has(item.area)) {
    errors.push(`${label}: invalid area bucket ${item.area}`);
  }

  const areaId = getAreaBucketId(item);
  if (areaId) {
    areaCounts.set(areaId, (areaCounts.get(areaId) || 0) + 1);
  }

  if (!Array.isArray(item.aliases)) {
    errors.push(`${label}: aliases must be an array`);
  } else if (item.aliases.some((alias) => typeof alias !== "string" || alias.trim() === "")) {
    errors.push(`${label}: aliases must contain only non-empty strings`);
  }

  if (
    item.teachingNote !== undefined &&
    (typeof item.teachingNote !== "string" || item.teachingNote.trim() === "")
  ) {
    errors.push(`${label}: teachingNote must be a non-empty string when present`);
  }
}

for (const anchor of requiredAnchors) {
  if (!coveredStreets.has(anchor)) {
    errors.push(`missing required anchor street: ${anchor}`);
  }
}

for (const check of coordinateQaChecks) {
  const item = intersections.find((candidate) => candidate.id === check.id);
  if (!item) {
    errors.push(`${check.id}: missing coordinate QA target`);
    continue;
  }

  const latDelta = Math.abs(item.lat - check.expected.lat);
  const lonDelta = Math.abs(item.lon - check.expected.lon);
  if (latDelta > check.maxDelta || lonDelta > check.maxDelta) {
    errors.push(`${check.id}: coordinate QA failed; ${check.note}`);
  }
}

for (const bucket of areaBuckets) {
  const count = areaCounts.get(bucket.id) || 0;
  if (count < minAreaBucketSize) {
    errors.push(`${bucket.id}: only ${count} intersections; minimum is ${minAreaBucketSize}`);
  }
}

if (errors.length > 0) {
  console.error(`Seed validation failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const difficultyCounts = intersections.reduce((counts, item) => {
  counts[item.difficulty] = (counts[item.difficulty] || 0) + 1;
  return counts;
}, {});
const areaCountsObject = Object.fromEntries(areaCounts);

console.log(`Seed validation passed: ${intersections.length} intersections.`);
console.log(`Difficulty mix: ${JSON.stringify(difficultyCounts)}`);
console.log(`Area mix: ${JSON.stringify(areaCountsObject)}`);

function getAreaBucketId(item) {
  if (item && typeof item.area === "string" && areaBucketIds.has(item.area)) {
    return item.area;
  }

  const region = item && typeof item.region === "string" ? item.region : "";
  const bucket = areaBuckets.find((candidate) =>
    Array.isArray(candidate.patterns) &&
    candidate.patterns.some((pattern) => region.includes(pattern))
  );

  if (!bucket) {
    errors.push(`${item && item.id ? item.id : "unknown row"}: no area bucket for region ${region}`);
    return undefined;
  }

  return bucket.id;
}
