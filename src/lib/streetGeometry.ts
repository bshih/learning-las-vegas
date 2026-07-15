import type { Coordinate } from "../data/types.ts";

export type GeoJsonPosition = readonly [longitude: number, latitude: number];

export type StreetLineString = {
  type: "LineString";
  coordinates: readonly GeoJsonPosition[];
};

export type StreetMultiLineString = {
  type: "MultiLineString";
  coordinates: readonly (readonly GeoJsonPosition[])[];
};

export type StreetGeometry = StreetLineString | StreetMultiLineString;

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function coordinateFromPosition(position: GeoJsonPosition): Coordinate {
  return { lon: position[0], lat: position[1] };
}

function pointToSegmentDistanceMeters(
  point: Coordinate,
  start: GeoJsonPosition,
  end: GeoJsonPosition,
): number {
  const referenceLatitude = toRadians(point.lat);
  const project = ([longitude, latitude]: GeoJsonPosition) => ({
    x:
      EARTH_RADIUS_METERS *
      toRadians(longitude - point.lon) *
      Math.cos(referenceLatitude),
    y: EARTH_RADIUS_METERS * toRadians(latitude - point.lat),
  });
  const projectedStart = project(start);
  const projectedEnd = project(end);
  const segmentX = projectedEnd.x - projectedStart.x;
  const segmentY = projectedEnd.y - projectedStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(projectedStart.x, projectedStart.y);
  }

  const projection = Math.min(
    1,
    Math.max(
      0,
      -(projectedStart.x * segmentX + projectedStart.y * segmentY) /
        segmentLengthSquared,
    ),
  );
  const nearestX = projectedStart.x + projection * segmentX;
  const nearestY = projectedStart.y + projection * segmentY;

  return Math.hypot(nearestX, nearestY);
}

export function pointToLineStringDistanceMeters(
  point: Coordinate,
  coordinates: readonly GeoJsonPosition[],
): number {
  if (coordinates.length === 0) return Number.POSITIVE_INFINITY;
  if (coordinates.length === 1) {
    const onlyPoint = coordinateFromPosition(coordinates[0]);
    const longitudeMeters =
      EARTH_RADIUS_METERS *
      toRadians(onlyPoint.lon - point.lon) *
      Math.cos(toRadians(point.lat));
    const latitudeMeters =
      EARTH_RADIUS_METERS * toRadians(onlyPoint.lat - point.lat);
    return Math.hypot(longitudeMeters, latitudeMeters);
  }

  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < coordinates.length; index += 1) {
    nearestDistance = Math.min(
      nearestDistance,
      pointToSegmentDistanceMeters(point, coordinates[index - 1], coordinates[index]),
    );
  }

  return nearestDistance;
}

export function pointToStreetGeometryDistanceMeters(
  point: Coordinate,
  geometry: StreetGeometry,
): number {
  if (geometry.type === "LineString") {
    return pointToLineStringDistanceMeters(point, geometry.coordinates);
  }

  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const line of geometry.coordinates) {
    nearestDistance = Math.min(
      nearestDistance,
      pointToLineStringDistanceMeters(point, line),
    );
  }
  return nearestDistance;
}
