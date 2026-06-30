import type { Coordinate, Intersection } from "../data";
import { haversineDistanceMeters } from "./geo";

type StreetOrientation = "eastWest" | "northSouth" | "unknown";

const ROAD_AXIS_THRESHOLD_METERS = 900;
const BULLSEYE_METERS = 250;

export function getRoadFeedback(
  answer: Intersection,
  guess: Coordinate,
  intersections: readonly Intersection[],
): string | null {
  const roads = [answer.primaryStreet, answer.crossStreet].map((street) => ({
    street,
    offsetMeters: distanceFromStreetAxis(answer.coordinate, guess, inferStreetOrientation(street, intersections)),
  }));
  const closeRoads = roads.filter((road) => road.offsetMeters <= ROAD_AXIS_THRESHOLD_METERS);
  const answerDistance = haversineDistanceMeters(answer.coordinate, guess);

  if (answerDistance <= BULLSEYE_METERS) return null;

  if (closeRoads.length === 2) {
    return "Road read: you had the right road pair; tighten the exact corner.";
  }

  if (closeRoads.length === 1) {
    const missedRoad = roads.find((road) => road.street !== closeRoads[0].street);
    return `Road read: close to ${closeRoads[0].street}; ${missedRoad?.street ?? "the cross street"} was the miss.`;
  }

  return null;
}

function distanceFromStreetAxis(
  answer: Coordinate,
  guess: Coordinate,
  orientation: StreetOrientation,
): number {
  if (orientation === "northSouth") {
    return haversineDistanceMeters(answer, { lat: answer.lat, lon: guess.lon });
  }

  if (orientation === "eastWest") {
    return haversineDistanceMeters(answer, { lat: guess.lat, lon: answer.lon });
  }

  return haversineDistanceMeters(answer, guess);
}

function inferStreetOrientation(
  street: string,
  intersections: readonly Intersection[],
): StreetOrientation {
  const matches = intersections.filter(
    (intersection) =>
      intersection.primaryStreet === street || intersection.crossStreet === street,
  );

  if (matches.length < 2) return "unknown";

  const latitudes = matches.map((intersection) => intersection.coordinate.lat);
  const longitudes = matches.map((intersection) => intersection.coordinate.lon);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const latSpanMeters = haversineDistanceMeters(
    { lat: minLat, lon: midLon },
    { lat: maxLat, lon: midLon },
  );
  const lonSpanMeters = haversineDistanceMeters(
    { lat: midLat, lon: minLon },
    { lat: midLat, lon: maxLon },
  );

  if (latSpanMeters > lonSpanMeters * 1.2) return "northSouth";
  if (lonSpanMeters > latSpanMeters * 1.2) return "eastWest";
  return "unknown";
}
