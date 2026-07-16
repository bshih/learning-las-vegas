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
  selectIntersectionFocusItems,
  selectStreetFocusItems,
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
const sameCrossingAlias = intersection("same-crossing-alias", "Main", "Alias", 36.1008, -115.2);
const sameCrossingResolution = scoreGuess(
  targetIntersection,
  sameCrossingAlias.coordinate,
  [sameCrossingAlias, targetIntersection],
);
assertEqual(
  sameCrossingResolution.isCorrect,
  true,
  "Co-located names for the same physical crossing count as correct",
);

const streetIds = Array.from({ length: 32 }, (_, index) => `street-${index}`);
const firstStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "all-streets",
  completedSessionCount: 0,
});
const nextStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "all-streets",
  completedSessionCount: 1,
});
const thirdStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "all-streets",
  completedSessionCount: 2,
});
const fourthStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "all-streets",
  completedSessionCount: 3,
});
assertEqual(firstStreetFocus.length, 10, "Street session has ten items");
assertEqual(new Set(firstStreetFocus).size, 10, "Street session items are distinct");
assertEqual(new Set([...firstStreetFocus, ...nextStreetFocus, ...thirdStreetFocus, ...fourthStreetFocus]).size, 32, "Four sessions cover the full pool before recycling");
const retriedStreetFocus = selectStreetFocusItems(streetIds, {
  scopeId: "all-streets",
  completedSessionCount: 4,
  retryMissItemIds: [firstStreetFocus[3], firstStreetFocus[7]],
});
assertEqual(retriedStreetFocus[0], firstStreetFocus[3], "Street retry misses come first");
assertEqual(retriedStreetFocus[1], firstStreetFocus[7], "Street retry miss order is stable");
assertEqual(new Set(retriedStreetFocus).size, 10, "Retry sessions remain distinct");

const intersectionIds = Array.from({ length: 24 }, (_, index) => `i${index}`);
const intersectionFocus = selectIntersectionFocusItems(intersectionIds, {
  scopeId: "all",
  completedSessionCount: 0,
  retryMissItemIds: ["i23", "i22", "missing", "i23"],
});
assertEqual(intersectionFocus.length, 10, "Intersection round has ten distinct items");
assertEqual(new Set(intersectionFocus).size, 10, "Intersection round does not repeat prompts");
assertEqual(intersectionFocus[0], "i23", "Retry misses seed the next selection");
assertEqual(intersectionFocus[1], "i22", "Retry miss order is stable");
const firstIntersectionRound = selectIntersectionFocusItems(intersectionIds, {
  scopeId: "all",
  completedSessionCount: 0,
});
const secondIntersectionRound = selectIntersectionFocusItems(intersectionIds, {
  scopeId: "all",
  completedSessionCount: 1,
});
const thirdIntersectionRound = selectIntersectionFocusItems(intersectionIds, {
  scopeId: "all",
  completedSessionCount: 2,
});
assertEqual(
  new Set([...firstIntersectionRound, ...secondIntersectionRound, ...thirdIntersectionRound]).size,
  24,
  "Three intersection rounds cover the full 24-item area pool",
);
assertEqual(
  firstIntersectionRound.filter((itemId) => secondIntersectionRound.includes(itemId)).length,
  0,
  "Consecutive full-area rounds do not overlap when the pool has at least 20 items",
);

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
