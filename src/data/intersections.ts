import { getAreaBucketId } from "./areaBuckets";
import type { Intersection } from "./types";
import type { AreaBucketId } from "./types";
import rawIntersections from "./intersections.json";

export type IntersectionDifficulty = "easy" | "medium" | "hard";

export type SeedIntersection = {
  id: string;
  streetA: string;
  streetB: string;
  lat: number;
  lon: number;
  region: string;
  area?: AreaBucketId;
  difficulty: IntersectionDifficulty;
  aliases: string[];
  teachingNote?: string;
};

export const seedIntersectionData = rawIntersections as SeedIntersection[];

export const intersections: Intersection[] = seedIntersectionData.map((item) => ({
  id: item.id,
  streetA: item.streetA,
  streetB: item.streetB,
  lat: item.lat,
  lon: item.lon,
  region: item.region,
  area: getAreaBucketId(item),
  difficulty: item.difficulty,
  aliases: item.aliases,
  teachingNote: item.teachingNote,
  primaryStreet: item.streetA,
  crossStreet: item.streetB,
  coordinate: { lat: item.lat, lon: item.lon },
  notes: item.teachingNote,
}));
