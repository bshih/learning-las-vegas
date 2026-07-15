import type { Coordinate } from "../data/types.ts";
import type { StreetAxis } from "./feedback.ts";
import {
  pointToStreetGeometryDistanceMeters,
  type StreetGeometry,
} from "./streetGeometry.ts";

export type LearningScore = 0 | 1 | 2 | 3 | 4;

export const SCORE_THRESHOLDS_METERS = {
  correct: 650,
  veryClose: 1609.344,
  nearby: 6_000,
  acrossTown: 12_000,
} as const;

export type ScorableStreet = {
  id: string;
  name: string;
  axis: StreetAxis;
  geometry: StreetGeometry;
};

export type StreetScoreResult = {
  targetStreet: ScorableStreet;
  nearestEligibleStreet: ScorableStreet;
  targetDistanceMeters: number;
  nearestDistanceMeters: number;
  score: LearningScore;
  correct: boolean;
};

export function scorePartialDistance(distanceMeters: number): Exclude<LearningScore, 4> {
  if (distanceMeters <= SCORE_THRESHOLDS_METERS.veryClose) return 3;
  if (distanceMeters <= SCORE_THRESHOLDS_METERS.nearby) return 2;
  if (distanceMeters <= SCORE_THRESHOLDS_METERS.acrossTown) return 1;
  return 0;
}

function axesAreComparable(target: StreetAxis, candidate: StreetAxis): boolean {
  return target === candidate;
}

export function scoreStreetGuess(
  targetStreetId: string,
  coordinate: Coordinate,
  comparisonPool: readonly ScorableStreet[],
): StreetScoreResult {
  const targetStreet = comparisonPool.find((street) => street.id === targetStreetId);
  if (!targetStreet) {
    throw new RangeError(`Unknown target street: ${targetStreetId}`);
  }

  const eligibleStreets = comparisonPool.filter(
    (street) =>
      street.id === targetStreet.id || axesAreComparable(targetStreet.axis, street.axis),
  );
  const measured = eligibleStreets
    .map((street) => ({
      street,
      distanceMeters: pointToStreetGeometryDistanceMeters(coordinate, street.geometry),
    }))
    .sort(
      (left, right) =>
        left.distanceMeters - right.distanceMeters ||
        left.street.id.localeCompare(right.street.id),
    );
  const nearest = measured[0];
  const targetDistanceMeters = measured.find(
    ({ street }) => street.id === targetStreet.id,
  )?.distanceMeters;

  if (!nearest || targetDistanceMeters === undefined) {
    throw new RangeError("Street comparison pool has no measurable target geometry");
  }

  const correct =
    nearest.street.id === targetStreet.id &&
    targetDistanceMeters <= SCORE_THRESHOLDS_METERS.correct;

  return {
    targetStreet,
    nearestEligibleStreet: nearest.street,
    targetDistanceMeters,
    nearestDistanceMeters: nearest.distanceMeters,
    score: correct ? 4 : scorePartialDistance(targetDistanceMeters),
    correct,
  };
}
