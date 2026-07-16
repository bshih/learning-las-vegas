import type { LearningScore } from "./streetScoring.ts";

export type SessionAttempt = {
  itemId: string;
  score: LearningScore;
  correct: boolean;
};

export type ScopeSelectionOptions = {
  scopeId: string;
  completedSessionCount: number;
  retryMissItemIds?: readonly string[];
  seed?: string;
};

const STREET_SESSION_COUNT = 10;
const INTERSECTION_SESSION_COUNT = 10;

function seededRank(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function uniqueEligibleIds(
  itemIds: readonly string[],
  eligibleIds: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>();
  return itemIds.filter((itemId) => {
    if (!eligibleIds.has(itemId) || seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  });
}

export function selectScopeItems(
  itemIds: readonly string[],
  count: number,
  options: ScopeSelectionOptions,
): string[] {
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length < count) {
    throw new RangeError(`Scope requires at least ${count} distinct items`);
  }

  const seed = options.seed ?? "melissa-map-v2";
  const ranked = [...uniqueIds].sort((left, right) => {
    const leftRank = seededRank(`${seed}:${options.scopeId}:${left}`);
    const rightRank = seededRank(`${seed}:${options.scopeId}:${right}`);
    return leftRank - rightRank || left.localeCompare(right);
  });
  const offset =
    ((options.completedSessionCount * count) % ranked.length + ranked.length) %
    ranked.length;
  const rotated = ranked.map((_, index) => ranked[(offset + index) % ranked.length]);
  const retryItems = uniqueEligibleIds(
    options.retryMissItemIds ?? [],
    new Set(uniqueIds),
  ).slice(0, count);
  const selected = [...retryItems];

  for (const itemId of rotated) {
    if (!selected.includes(itemId)) selected.push(itemId);
    if (selected.length === count) break;
  }

  return selected;
}

export function selectStreetFocusItems(
  streetIds: readonly string[],
  options: ScopeSelectionOptions,
): string[] {
  return selectScopeItems(streetIds, STREET_SESSION_COUNT, options);
}

export function selectIntersectionFocusItems(
  intersectionIds: readonly string[],
  options: ScopeSelectionOptions,
): string[] {
  return selectScopeItems(intersectionIds, INTERSECTION_SESSION_COUNT, options);
}
