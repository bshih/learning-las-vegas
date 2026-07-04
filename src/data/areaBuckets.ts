import rawAreaBuckets from "./areaBuckets.json";
import type { AreaBucketId, Intersection, PlayAreaId } from "./types";

export type AreaBucket = {
  id: AreaBucketId;
  label: string;
  patterns: string[];
};

export type AreaOption = {
  id: PlayAreaId;
  label: string;
  count: number;
};

export const ALL_AREA_ID = "all";
export const ALL_AREA_LABEL = "All Areas";
export const AREA_BUCKETS = rawAreaBuckets as readonly AreaBucket[];

const areaBucketIds = new Set<string>(AREA_BUCKETS.map((bucket) => bucket.id));

export function isAreaBucketId(value: string | undefined): value is AreaBucketId {
  return Boolean(value && areaBucketIds.has(value));
}

export function isPlayAreaId(value: string | undefined): value is PlayAreaId {
  return value === ALL_AREA_ID || isAreaBucketId(value);
}

export function getAreaBucketLabel(areaId: PlayAreaId): string {
  if (areaId === ALL_AREA_ID) return ALL_AREA_LABEL;
  return AREA_BUCKETS.find((bucket) => bucket.id === areaId)?.label || ALL_AREA_LABEL;
}

export function getAreaBucketId(item: Pick<Intersection, "area" | "region">): AreaBucketId {
  if (isAreaBucketId(item.area)) return item.area;

  const region = item.region || "";
  const matchedBucket = AREA_BUCKETS.find((bucket) =>
    bucket.patterns.some((pattern) => region.includes(pattern)),
  );

  if (!matchedBucket) {
    throw new Error(`No area bucket matches region: ${region || "unknown"}`);
  }

  return matchedBucket.id;
}

export function filterIntersectionsByArea(
  intersections: readonly Intersection[],
  areaId: PlayAreaId,
): Intersection[] {
  if (areaId === ALL_AREA_ID) return [...intersections];
  return intersections.filter((intersection) => intersection.area === areaId);
}

export function getAreaOptions(intersections: readonly Intersection[]): AreaOption[] {
  const counts = new Map<AreaBucketId, number>();
  for (const intersection of intersections) {
    const areaId = getAreaBucketId(intersection);
    counts.set(areaId, (counts.get(areaId) || 0) + 1);
  }

  return [
    {
      id: ALL_AREA_ID,
      label: ALL_AREA_LABEL,
      count: intersections.length,
    },
    ...AREA_BUCKETS.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      count: counts.get(bucket.id) || 0,
    })),
  ];
}
