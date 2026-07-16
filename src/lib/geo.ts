import type { BoundingBox, Coordinate, Guess, Intersection } from "../data/types.ts";
import {
  SCORE_THRESHOLDS_METERS,
  scorePartialDistance,
  type LearningScore,
} from "./streetScoring.ts";

export type IntersectionScoreResult = Omit<Guess, "closenessScore"> & {
  closenessScore: LearningScore;
};

export const LAS_VEGAS_BOUNDS: BoundingBox = {
  southwest: { lat: 35.9, lon: -115.45 },
  northeast: { lat: 36.38, lon: -114.9 },
};

const EARTH_RADIUS_METERS = 6_371_000;
const SAME_CROSSING_RADIUS_METERS = 150;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineDistanceMeters(a: Coordinate, b: Coordinate): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function scoreDistance(distanceMeters: number): Exclude<LearningScore, 4> {
  return scorePartialDistance(distanceMeters);
}

export function findNearestIntersection(
  coordinate: Coordinate,
  intersections: readonly Intersection[],
): { intersection: Intersection; distanceMeters: number } | null {
  let nearest: { intersection: Intersection; distanceMeters: number } | null = null;

  for (const intersection of intersections) {
    const distanceMeters = haversineDistanceMeters(intersection.coordinate, coordinate);
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { intersection, distanceMeters };
    }
  }

  return nearest;
}

export function scoreGuess(
  answer: Intersection,
  coordinate: Coordinate,
  intersections: readonly Intersection[] = [answer],
): IntersectionScoreResult {
  const distanceMeters = haversineDistanceMeters(answer.coordinate, coordinate);
  const nearest = findNearestIntersection(coordinate, intersections) ?? {
    intersection: answer,
    distanceMeters,
  };
  const nearestRepresentsAnswer =
    nearest.intersection.id === answer.id ||
    haversineDistanceMeters(nearest.intersection.coordinate, answer.coordinate) <=
      SAME_CROSSING_RADIUS_METERS;
  const isCorrect =
    nearestRepresentsAnswer &&
    nearest.distanceMeters <= SCORE_THRESHOLDS_METERS.correct;
  const closenessScore = isCorrect ? 4 : scoreDistance(distanceMeters);

  return {
    coordinate: isCorrect ? answer.coordinate : coordinate,
    distanceMeters,
    closenessScore,
    nearestIntersection: nearest.intersection,
    nearestDistanceMeters: nearest.distanceMeters,
    isCorrect,
    result:
      isCorrect
        ? "correct"
        : distanceMeters <= SCORE_THRESHOLDS_METERS.veryClose
          ? "near"
          : "miss",
  };
}

export function isCoordinateInBounds(
  coordinate: Coordinate,
  bounds: BoundingBox = LAS_VEGAS_BOUNDS,
): boolean {
  return (
    coordinate.lat >= bounds.southwest.lat &&
    coordinate.lat <= bounds.northeast.lat &&
    coordinate.lon >= bounds.southwest.lon &&
    coordinate.lon <= bounds.northeast.lon
  );
}

export function clampCoordinateToBounds(
  coordinate: Coordinate,
  bounds: BoundingBox = LAS_VEGAS_BOUNDS,
): Coordinate {
  return {
    lat: Math.min(
      Math.max(coordinate.lat, bounds.southwest.lat),
      bounds.northeast.lat,
    ),
    lon: Math.min(
      Math.max(coordinate.lon, bounds.southwest.lon),
      bounds.northeast.lon,
    ),
  };
}

export function coordinateToUnitPoint(
  coordinate: Coordinate,
  bounds: BoundingBox = LAS_VEGAS_BOUNDS,
): { x: number; y: number } {
  const clamped = clampCoordinateToBounds(coordinate, bounds);
  const x =
    (clamped.lon - bounds.southwest.lon) /
    (bounds.northeast.lon - bounds.southwest.lon);
  const y =
    1 -
    (clamped.lat - bounds.southwest.lat) /
      (bounds.northeast.lat - bounds.southwest.lat);

  return { x, y };
}

export function unitPointToCoordinate(
  point: { x: number; y: number },
  bounds: BoundingBox = LAS_VEGAS_BOUNDS,
): Coordinate {
  const x = Math.min(Math.max(point.x, 0), 1);
  const y = Math.min(Math.max(point.y, 0), 1);

  return {
    lat:
      bounds.southwest.lat +
      (1 - y) * (bounds.northeast.lat - bounds.southwest.lat),
    lon:
      bounds.southwest.lon +
      x * (bounds.northeast.lon - bounds.southwest.lon),
  };
}
