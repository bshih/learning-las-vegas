import type { BoundingBox, Coordinate, Guess, Intersection } from "../data/types";

export const LAS_VEGAS_BOUNDS: BoundingBox = {
  southwest: { lat: 35.9, lon: -115.45 },
  northeast: { lat: 36.38, lon: -114.9 },
};

const EARTH_RADIUS_METERS = 6_371_000;

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

export function scoreDistance(distanceMeters: number): number {
  if (distanceMeters <= 75) return 100;
  if (distanceMeters >= 5_000) return 0;

  const normalized = (distanceMeters - 75) / (5_000 - 75);
  return Math.max(0, Math.round(100 * (1 - normalized)));
}

export function scoreGuess(
  answer: Intersection,
  coordinate: Coordinate,
): Guess {
  const distanceMeters = haversineDistanceMeters(answer.coordinate, coordinate);

  return {
    coordinate,
    distanceMeters,
    score: scoreDistance(distanceMeters),
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
