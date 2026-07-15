import type { Intersection } from "../data/types";
import {
  pointToLineStringDistanceMeters,
  pointToStreetGeometryDistanceMeters,
} from "./streetGeometry.ts";
import {
  scorePartialDistance,
  scoreStreetGuess,
  type ScorableStreet,
} from "./streetScoring.ts";
import { scoreGuess } from "./geo.ts";
import {
  buildIntersectionSessionItemIds,
  buildStreetSessionItemIds,
  selectIntersectionFocusItems,
  selectStreetFocusItems,
  type SessionAttempt,
} from "./sessionDeck.ts";
import {
  selectIntersectionFeedback,
  selectStreetFeedback,
  type OrderedFeedbackGroup,
} from "./feedback.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function intersection(
  id: string,
  primaryStreet: string,
  crossStreet: string,
  lat: number,
  lon: number,
): Intersection {
  return {
    id,
    primaryStreet,
    crossStreet,
    coordinate: { lat, lon },
  };
}

const targetCoordinates = [
  [-115.2, 36.0],
  [-115.2, 36.2],
] as const;

const targetLine: ScorableStreet = {
  id: "target",
  name: "Target Road",
  axis: "north-south",
  geometry: {
    type: "LineString",
    coordinates: targetCoordinates,
  },
};

const parallelLine: ScorableStreet = {
  id: "parallel",
  name: "Parallel Road",
  axis: "north-south",
  geometry: {
    type: "LineString",
    coordinates: [
      [-115.18, 36.0],
      [-115.18, 36.2],
    ],
  },
};

const perpendicularLine: ScorableStreet = {
  id: "perpendicular",
  name: "Crossing Road",
  axis: "east-west",
  geometry: {
    type: "LineString",
    coordinates: [
      [-115.3, 36.1],
      [-115.1, 36.1],
    ],
  },
};

const lineDistance = pointToLineStringDistanceMeters(
  { lat: 36.1, lon: -115.19 },
  targetCoordinates,
);
assert(lineDistance > 890 && lineDistance < 910, "LineString distance uses geographic meters");

const multiDistance = pointToStreetGeometryDistanceMeters(
  { lat: 36.1, lon: -115.19 },
  {
    type: "MultiLineString",
    coordinates: [
      [
        [-115.3, 36.0],
        [-115.3, 36.2],
      ],
      targetCoordinates,
    ],
  },
);
assert(Math.abs(multiDistance - lineDistance) < 0.001, "MultiLineString uses nearest segment");

const perpendicularExcluded = scoreStreetGuess(
  "target",
  { lat: 36.1, lon: -115.2 },
  [targetLine, parallelLine, perpendicularLine],
);
assertEqual(perpendicularExcluded.correct, true, "Perpendicular road cannot steal resolution");
assertEqual(perpendicularExcluded.score, 4, "Correct street receives four points");

const nearestParallel = scoreStreetGuess(
  "target",
  { lat: 36.1, lon: -115.18 },
  [targetLine, parallelLine, perpendicularLine],
);
assertEqual(nearestParallel.nearestEligibleStreet.id, "parallel", "Nearest parallel street resolves");
assertEqual(nearestParallel.score, 2, "Target distance controls partial credit");
assertEqual(scorePartialDistance(1609.344), 3, "Very-close threshold is inclusive");
assertEqual(scorePartialDistance(1609.345), 2, "Very-close threshold ends above one mile");
assertEqual(scorePartialDistance(6_000), 2, "Nearby threshold is inclusive");
assertEqual(scorePartialDistance(6_000.001), 1, "Nearby threshold ends above six kilometers");
assertEqual(scorePartialDistance(12_000), 1, "Across-town threshold is inclusive");
assertEqual(scorePartialDistance(12_000.001), 0, "Lost-in-valley starts above twelve kilometers");

const targetIntersection = intersection("target", "Main", "First", 36.1, -115.2);
const nearbyIntersection = intersection("nearby", "Main", "Second", 36.1, -115.195);
const wrongResolution = scoreGuess(
  targetIntersection,
  nearbyIntersection.coordinate,
  [targetIntersection, nearbyIntersection],
);
assertEqual(wrongResolution.isCorrect, false, "Nearest wrong intersection blocks correctness");
assertEqual(wrongResolution.closenessScore, 3, "A near miss cannot receive four points");
assertEqual(
  scoreGuess(targetIntersection, targetIntersection.coordinate, [targetIntersection, nearbyIntersection])
    .closenessScore,
  4,
  "Correct intersection receives four points",
);

const streetIds = ["a", "b", "c", "d", "e", "f", "g"];
const firstStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "west-grid",
  completedSessionCount: 0,
});
const nextStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "west-grid",
  completedSessionCount: 1,
});
assertEqual(firstStreetFocus.length, 5, "Street focus has five distinct items");
assert(
  firstStreetFocus.join(",") !== nextStreetFocus.join(","),
  "Completed-session count rotates a street scope",
);

const streetAttempts: SessionAttempt[] = firstStreetFocus.map((itemId, index) => ({
  itemId,
  correct: index < 2,
  score: (index < 2 ? 4 : index - 2) as 0 | 1 | 2 | 3 | 4,
}));
const streetSession = buildStreetSessionItemIds(firstStreetFocus, streetAttempts);
assertEqual(streetSession.length, 10, "Street session has ten prompts");
assertEqual(new Set(streetSession.slice(0, 5)).size, 5, "Street first half is distinct");
assertEqual(
  new Set(streetSession.slice(5)).size,
  5,
  "Street second half repeats every focus item once",
);
assertEqual(
  streetSession[9],
  firstStreetFocus[2],
  "Weakest first attempt appears latest in repeat half",
);

const intersectionIds = ["i0", "i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9"];
const intersectionFocus = selectIntersectionFocusItems(intersectionIds, {
  scopeId: "all",
  completedSessionCount: 0,
  retryMissItemIds: ["i9", "i8", "missing", "i9"],
});
assertEqual(intersectionFocus.length, 8, "Intersection focus has eight distinct items");
assertEqual(intersectionFocus[0], "i9", "Retry misses seed the next selection");
assertEqual(intersectionFocus[1], "i8", "Retry miss order is stable");
const intersectionAttempts: SessionAttempt[] = intersectionFocus.map((itemId, index) => ({
  itemId,
  correct: index !== 1 && index !== 6,
  score: (index === 1 ? 0 : index === 6 ? 1 : 4) as 0 | 1 | 2 | 3 | 4,
}));
const intersectionSession = buildIntersectionSessionItemIds(
  intersectionFocus,
  intersectionAttempts,
);
assertEqual(intersectionSession.length, 10, "Intersection session has ten prompts");
assertEqual(intersectionSession[8], intersectionFocus[1], "Weakest intersection repeats");
assertEqual(intersectionSession[9], intersectionFocus[6], "Second-weakest intersection repeats");

const eastWestOrder: OrderedFeedbackGroup = {
  id: "east-west",
  kind: "ordered",
  orderedDirection: "west-to-east",
  streetIds: ["First", "Second", "Third", "Fourth"],
};
const targetFeedbackIntersection = {
  id: "main-third",
  streetIds: ["Main", "Third"] as const,
  coordinate: { lat: 36.12, lon: -115.2 },
  areaId: "west-side",
};
const sameRoadFeedback = selectIntersectionFeedback({
  correct: false,
  score: 2,
  target: targetFeedbackIntersection,
  guess: { lat: 36.1, lon: -115.2 },
  nearestKnown: {
    id: "main-first",
    streetIds: ["Main", "First"],
    coordinate: { lat: 36.1, lon: -115.2 },
  },
  orderedGroups: [eastWestOrder],
});
assertEqual(sameRoadFeedback.kind, "same-road", "Same-road feedback has first priority");

const areaFeedback = selectIntersectionFeedback({
  correct: false,
  score: 0,
  target: targetFeedbackIntersection,
  guess: { lat: 36.0, lon: -115.2 },
  nearestKnown: {
    id: "main-first",
    streetIds: ["Main", "First"],
    coordinate: { lat: 36.1, lon: -115.2 },
  },
  orderedGroups: [eastWestOrder],
});
assertEqual(areaFeedback.kind, "area-direction", "Zero-point feedback skips road claims");

const orderedStreetFeedback = selectStreetFeedback({
  correct: false,
  score: 2,
  targetStreetId: "Third",
  group: eastWestOrder,
  nearestEligibleStreetId: "Second",
});
assertEqual(orderedStreetFeedback.kind, "ordered-neighbor", "Ordered groups allow neighbor feedback");
const shapeStreetFeedback = selectStreetFeedback({
  correct: false,
  score: 2,
  targetStreetId: "Curve",
  group: { id: "shapes", kind: "shape", streetIds: ["Curve", "Branch"] },
  nearestEligibleStreetId: "Branch",
  nearestStreetIsTrustworthy: false,
  targetAreaId: "west-side",
  targetDirectionFromGuess: "west",
});
assertEqual(
  shapeStreetFeedback.kind,
  "shape-area-direction",
  "Shape groups use area direction without ordered counts",
);

console.log("Melissa Map pure-logic regression fixtures passed");
