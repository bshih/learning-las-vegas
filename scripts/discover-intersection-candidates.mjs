import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/streetGroups.json"), "utf8"));
const existing = JSON.parse(fs.readFileSync(path.join(root, "src/data/intersections.json"), "utf8"));
const bounds = { south: 35.9, west: -115.45, north: 36.38, east: -114.9 };
const overpassUrl = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const roadHighways = new Set([
  "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
  "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link",
]);

const names = catalog.streets.flatMap((street) => [street.name, ...street.aliases]);
const pattern = names.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|");
const query = `[out:json][timeout:90];
way(${bounds.south},${bounds.west},${bounds.north},${bounds.east})["highway"]["name"~"${pattern}",i];
out geom;`;
const response = await fetch(overpassUrl, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "learning-las-vegas-intersection-discovery/0.1",
  },
  body: new URLSearchParams({ data: query }),
});
if (!response.ok) throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);

const osm = await response.json();
const definitionsByName = new Map();
for (const street of catalog.streets) {
  for (const name of [street.name, ...street.aliases]) definitionsByName.set(normalizeName(name), street);
}
const ways = osm.elements.flatMap((element) => {
  if (element.type !== "way" || !element.geometry || !roadHighways.has(element.tags?.highway)) return [];
  const street = definitionsByName.get(normalizeName(element.tags?.name || ""));
  return street ? [{ ...element, street }] : [];
});
const candidates = [];

for (let left = 0; left < catalog.streets.length; left += 1) {
  for (let right = left + 1; right < catalog.streets.length; right += 1) {
    const streetA = catalog.streets[left];
    const streetB = catalog.streets[right];
    const waysA = ways.filter((way) => way.street.id === streetA.id);
    const waysB = ways.filter((way) => way.street.id === streetB.id);
    for (const wayA of waysA) {
      for (const wayB of waysB) {
        for (const coordinate of findWayCrossings(wayA, wayB)) {
          if (candidates.some((item) => item.streetA === streetA.name && item.streetB === streetB.name && distanceMeters(item, coordinate) < 30)) continue;
          if (existing.some((item) => samePair(item, streetA.name, streetB.name) && distanceMeters(item, coordinate) < 500)) continue;
          candidates.push({ streetA: streetA.name, streetB: streetB.name, lat: coordinate.lat, lon: coordinate.lon });
        }
      }
    }
  }
}

candidates.sort((a, b) => b.lat - a.lat || a.lon - b.lon || a.streetA.localeCompare(b.streetA));
console.log(JSON.stringify(candidates, null, 2));

function normalizeName(value) {
  return value.toLowerCase().replace(/^(north|south|east|west)\s+/, "").replace(/\bst\.?\b/g, "saint").replace(/[^a-z0-9]+/g, " ").trim();
}

function samePair(item, streetA, streetB) {
  return (item.streetA === streetA && item.streetB === streetB) || (item.streetA === streetB && item.streetB === streetA);
}

function findWayCrossings(wayA, wayB) {
  const pointsA = wayA.geometry.map(toWorldPoint);
  const pointsB = wayB.geometry.map(toWorldPoint);
  const crossings = [];
  for (let a = 0; a < pointsA.length - 1; a += 1) {
    for (let b = 0; b < pointsB.length - 1; b += 1) {
      const point = segmentIntersection(pointsA[a], pointsA[a + 1], pointsB[b], pointsB[b + 1]);
      if (point) crossings.push(fromWorldPoint(point));
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
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

function toWorldPoint({ lat, lon }) {
  const radius = 6378137;
  return { x: radius * lon * Math.PI / 180, y: radius * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) };
}

function fromWorldPoint({ x, y }) {
  const radius = 6378137;
  return { lat: (2 * Math.atan(Math.exp(y / radius)) - Math.PI / 2) * 180 / Math.PI, lon: x / radius * 180 / Math.PI };
}

function distanceMeters(a, b) {
  const radius = 6371008.8;
  const latA = a.lat * Math.PI / 180;
  const latB = b.lat * Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * Math.PI / 180;
  const deltaLon = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
