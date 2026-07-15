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

const STREET_FOCUS_COUNT = 5;
const INTERSECTION_FOCUS_COUNT = 8;

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
  return selectScopeItems(streetIds, STREET_FOCUS_COUNT, options);
}

export function selectIntersectionFocusItems(
  intersectionIds: readonly string[],
  options: ScopeSelectionOptions,
): string[] {
  return selectScopeItems(intersectionIds, INTERSECTION_FOCUS_COUNT, options);
}

function firstAttemptByItem(
  attempts: readonly SessionAttempt[],
): ReadonlyMap<string, { attempt: SessionAttempt; index: number }> {
  const indexed = new Map<string, { attempt: SessionAttempt; index: number }>();
  attempts.forEach((attempt, index) => {
    if (!indexed.has(attempt.itemId)) indexed.set(attempt.itemId, { attempt, index });
  });
  return indexed;
}

export function orderStreetRepeatItems(
  focusItemIds: readonly string[],
  firstAttempts: readonly SessionAttempt[],
): string[] {
  if (focusItemIds.length !== STREET_FOCUS_COUNT) {
    throw new RangeError("Street sessions require exactly 5 focus items");
  }
  const attempts = firstAttemptByItem(firstAttempts);

  return [...focusItemIds].sort((left, right) => {
    const leftAttempt = attempts.get(left);
    const rightAttempt = attempts.get(right);
    if (!leftAttempt && !rightAttempt) return focusItemIds.indexOf(left) - focusItemIds.indexOf(right);
    if (!leftAttempt) return -1;
    if (!rightAttempt) return 1;
    if (leftAttempt.attempt.correct !== rightAttempt.attempt.correct) {
      return leftAttempt.attempt.correct ? -1 : 1;
    }
    return (
      rightAttempt.attempt.score - leftAttempt.attempt.score ||
      leftAttempt.index - rightAttempt.index
    );
  });
}

export function buildStreetSessionItemIds(
  focusItemIds: readonly string[],
  firstAttempts: readonly SessionAttempt[] = [],
): string[] {
  return [
    ...focusItemIds,
    ...orderStreetRepeatItems(focusItemIds, firstAttempts),
  ];
}

export function chooseWeakestIntersectionRepeats(
  focusItemIds: readonly string[],
  firstAttempts: readonly SessionAttempt[],
): string[] {
  if (focusItemIds.length !== INTERSECTION_FOCUS_COUNT) {
    throw new RangeError("Intersection sessions require exactly 8 focus items");
  }
  const attempts = firstAttemptByItem(firstAttempts);
  const ranked = focusItemIds
    .map((itemId, promptIndex) => ({ itemId, promptIndex, attempt: attempts.get(itemId)?.attempt }))
    .sort((left, right) => {
      if (!left.attempt && !right.attempt) return left.promptIndex - right.promptIndex;
      if (!left.attempt) return 1;
      if (!right.attempt) return -1;
      if (left.attempt.correct !== right.attempt.correct) {
        return left.attempt.correct ? 1 : -1;
      }
      return left.attempt.score - right.attempt.score || left.promptIndex - right.promptIndex;
    })
    .slice(0, 2);

  // Scheduling the earlier original prompt first maximizes spacing before each retry.
  return ranked.sort((left, right) => left.promptIndex - right.promptIndex).map(({ itemId }) => itemId);
}

export function buildIntersectionSessionItemIds(
  focusItemIds: readonly string[],
  firstAttempts: readonly SessionAttempt[],
): string[] {
  return [
    ...focusItemIds,
    ...chooseWeakestIntersectionRepeats(focusItemIds, firstAttempts),
  ];
}
