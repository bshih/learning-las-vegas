import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "src", "data", "intersections.json");
const raw = fs.readFileSync(dataPath, "utf8");
const intersections = JSON.parse(raw);

const bounds = {
  minLat: 35.9,
  maxLat: 36.38,
  minLon: -115.45,
  maxLon: -114.9
};
const difficulties = new Set(["easy", "medium", "hard"]);
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
const ids = new Set();
const coveredStreets = new Set();
const errors = [];

if (!Array.isArray(intersections)) {
  errors.push("Seed data must be a JSON array.");
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

console.log(`Seed validation passed: ${intersections.length} intersections.`);
console.log(`Difficulty mix: ${JSON.stringify(difficultyCounts)}`);
