import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "src", "data", "intersections.json");
const intersections = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const overpassUrl = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const bounds = {
  south: 35.9,
  west: -115.45,
  north: 36.38,
  east: -114.9
};
const roadHighways = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "motorway_link",
  "trunk_link",
  "primary_link",
  "secondary_link",
  "tertiary_link"
]);
const streetAliases = {
  "Martin Luther King Boulevard": [
    "Martin Luther King Boulevard",
    "Martin Luther King Junior Boulevard"
  ],
  "St. Rose Parkway": ["St\\. Rose Parkway", "Saint Rose Parkway"]
};

const options = parseArgs(process.argv.slice(2));
const targets = options.only
  ? intersections.filter((item) => options.only.has(item.id))
  : intersections;

if (targets.length === 0) {
  console.error("No matching seed rows to verify.");
  process.exit(1);
}

const roadNamePattern = buildRoadNamePattern(targets);
const query = `[out:json][timeout:60];
way(${bounds.south},${bounds.west},${bounds.north},${bounds.east})["highway"]["name"~"${roadNamePattern}",i];
out geom;`;

const response = await fetch(overpassUrl, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "melissa-map-seed-coordinate-verifier/0.1"
  },
  body: new URLSearchParams({ data: query })
});

if (!response.ok) {
  throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);
}

const osm = await response.json();
const roadWays = osm.elements.filter(isUsableRoadWay);
const failures = [];
const warnings = [];

for (const item of targets) {
  const crossings = findStreetCrossings(roadWays, item.streetA, item.streetB);
  if (crossings.length === 0) {
    failures.push(`${item.id}: no OSM road crossing found for ${item.streetA} / ${item.streetB}`);
    continue;
  }

  const seed = { lat: item.lat, lon: item.lon };
  const nearest = crossings
    .map((crossing) => ({
      ...crossing,
      distanceMeters: haversineDistanceMeters(seed, crossing.coordinate)
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

  const distance = Math.round(nearest.distanceMeters);
  const osmLabel = `${nearest.coordinate.lat.toFixed(5)}, ${nearest.coordinate.lon.toFixed(5)}`;
  const seedLabel = `${seed.lat.toFixed(5)}, ${seed.lon.toFixed(5)}`;

  if (nearest.distanceMeters > options.maxDistanceMeters) {
    failures.push(
      `${item.id}: ${distance}m from nearest OSM crossing; seed ${seedLabel}, OSM ${osmLabel}`
    );
  } else {
    warnings.push(`${item.id}: ok (${distance}m from OSM crossing ${osmLabel})`);
  }
}

for (const warning of warnings) {
  console.log(warning);
}

if (failures.length > 0) {
  console.error(`Coordinate verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Coordinate verification passed: ${targets.length} intersection(s).`);

function parseArgs(args) {
  const parsed = {
    maxDistanceMeters: 250,
    only: undefined
  };

  for (const arg of args) {
    if (arg.startsWith("--max-distance-m=")) {
      parsed.maxDistanceMeters = Number(arg.slice("--max-distance-m=".length));
    } else if (arg.startsWith("--only=")) {
      parsed.only = new Set(
        arg
          .slice("--only=".length)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      );
    }
  }

  if (!Number.isFinite(parsed.maxDistanceMeters) || parsed.maxDistanceMeters <= 0) {
    throw new Error("--max-distance-m must be a positive number.");
  }

  return parsed;
}

function buildRoadNamePattern(items) {
  const terms = new Set();
  for (const item of items) {
    for (const street of [item.streetA, item.streetB]) {
      for (const alias of streetAliases[street] || [escapeRegExp(street)]) {
        terms.add(alias);
      }
    }
  }

  return [...terms].join("|");
}

function isUsableRoadWay(element) {
  return (
    element.type === "way" &&
    element.geometry &&
    element.tags &&
    roadHighways.has(element.tags.highway) &&
    typeof element.tags.name === "string" &&
    !/trail/i.test(element.tags.name)
  );
}

function findStreetCrossings(ways, streetA, streetB) {
  const waysA = ways.filter((way) => wayMatchesStreet(way, streetA));
  const waysB = ways.filter((way) => wayMatchesStreet(way, streetB));
  const crossings = [];

  for (const wayA of waysA) {
    for (const wayB of waysB) {
      for (const crossing of findWayCrossings(wayA, wayB)) {
        if (
          !crossings.some(
            (existing) => haversineDistanceMeters(existing.coordinate, crossing.coordinate) < 20
          )
        ) {
          crossings.push(crossing);
        }
      }
    }
  }

  return crossings;
}

function wayMatchesStreet(way, street) {
  const name = way.tags.name;
  const normalizedName = stripDirectionalPrefix(name);
  const aliases = streetAliases[street] || [escapeRegExp(street)];

  return aliases.some((alias) => {
    const regex = new RegExp(`(^|\\b)${alias}(\\b|$)`, "i");
    return regex.test(name) || regex.test(normalizedName);
  });
}

function stripDirectionalPrefix(name) {
  return name.replace(/^(north|south|east|west)\s+/i, "");
}

function findWayCrossings(wayA, wayB) {
  const pointsA = wayA.geometry.map(coordinateToWorldPoint);
  const pointsB = wayB.geometry.map(coordinateToWorldPoint);
  const crossings = [];

  for (let indexA = 0; indexA < pointsA.length - 1; indexA += 1) {
    for (let indexB = 0; indexB < pointsB.length - 1; indexB += 1) {
      const intersection = segmentIntersection(
        pointsA[indexA],
        pointsA[indexA + 1],
        pointsB[indexB],
        pointsB[indexB + 1]
      );

      if (intersection) {
        crossings.push({
          coordinate: worldPointToCoordinate(intersection),
          wayA: wayA.tags.name,
          wayB: wayB.tags.name
        });
      }
    }
  }

  return crossings;
}

function segmentIntersection(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denominator = r.x * s.y - r.y * s.x;

  if (Math.abs(denominator) < 1e-9) return null;

  const q = { x: c.x - a.x, y: c.y - a.y };
  const t = (q.x * s.y - q.y * s.x) / denominator;
  const u = (q.x * r.y - q.y * r.x) / denominator;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return {
    x: a.x + t * r.x,
    y: a.y + t * r.y
  };
}

function coordinateToWorldPoint(coordinate) {
  const earthRadiusMeters = 6378137;
  const lonRadians = (coordinate.lon * Math.PI) / 180;
  const latRadians = (coordinate.lat * Math.PI) / 180;

  return {
    x: earthRadiusMeters * lonRadians,
    y: earthRadiusMeters * Math.log(Math.tan(Math.PI / 4 + latRadians / 2))
  };
}

function worldPointToCoordinate(point) {
  const earthRadiusMeters = 6378137;

  return {
    lat: ((2 * Math.atan(Math.exp(point.y / earthRadiusMeters)) - Math.PI / 2) * 180) / Math.PI,
    lon: ((point.x / earthRadiusMeters) * 180) / Math.PI
  };
}

function haversineDistanceMeters(a, b) {
  const earthRadiusMeters = 6371008.8;
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat + Math.cos(latA) * Math.cos(latB) * sinLon * sinLon;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
