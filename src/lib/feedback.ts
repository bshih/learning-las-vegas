import type { Coordinate } from "../data/types";
import type { LearningScore } from "./streetScoring";

export type StreetAxis = "north-south" | "east-west" | "regional";
export type CardinalDirection = "north" | "south" | "east" | "west";

export type OrderedFeedbackGroup = {
  id: string;
  kind: "ordered";
  orderedDirection: "west-to-east" | "north-to-south";
  streetIds: readonly string[];
};

export type ShapeFeedbackGroup = {
  id: string;
  kind: "shape";
  streetIds: readonly string[];
};

export type FeedbackStreetGroup = OrderedFeedbackGroup | ShapeFeedbackGroup;

export type FeedbackIntersection = {
  id: string;
  streetIds: readonly [string, string];
  coordinate: Coordinate;
  areaId?: string;
};

export type IntersectionFeedback =
  | { kind: "correct" }
  | {
      kind: "same-road";
      sharedStreetId: string;
      resolvedIntersectionId: string;
      direction?: CardinalDirection;
      streetCount?: number;
    }
  | {
      kind: "ordered-crossing";
      resolvedStreetId: string;
      targetStreetId: string;
      direction: CardinalDirection;
      streetCount: number;
    }
  | {
      kind: "area-direction";
      areaId: string;
      direction: CardinalDirection;
    }
  | { kind: "nearest-known"; intersectionId: string }
  | { kind: "distance"; score: Exclude<LearningScore, 4> };

export type IntersectionFeedbackContext = {
  correct: boolean;
  score: LearningScore;
  target: FeedbackIntersection;
  guess: Coordinate;
  nearestKnown?: FeedbackIntersection;
  orderedGroups?: readonly OrderedFeedbackGroup[];
};

function orderedRelation(
  resolvedStreetId: string,
  targetStreetId: string,
  groups: readonly OrderedFeedbackGroup[],
): { direction: CardinalDirection; streetCount: number } | null {
  for (const group of groups) {
    const resolvedIndex = group.streetIds.indexOf(resolvedStreetId);
    const targetIndex = group.streetIds.indexOf(targetStreetId);
    if (resolvedIndex < 0 || targetIndex < 0 || resolvedIndex === targetIndex) continue;
    const targetComesLater = targetIndex > resolvedIndex;
    return {
      direction:
        group.orderedDirection === "west-to-east"
          ? targetComesLater
            ? "east"
            : "west"
          : targetComesLater
            ? "south"
            : "north",
      streetCount: Math.abs(targetIndex - resolvedIndex),
    };
  }
  return null;
}

function targetDirectionFromGuess(
  guess: Coordinate,
  target: Coordinate,
): CardinalDirection {
  const latitudeDelta = target.lat - guess.lat;
  const longitudeDelta =
    (target.lon - guess.lon) * Math.cos(((target.lat + guess.lat) * Math.PI) / 360);
  if (Math.abs(latitudeDelta) >= Math.abs(longitudeDelta)) {
    return latitudeDelta >= 0 ? "north" : "south";
  }
  return longitudeDelta >= 0 ? "east" : "west";
}

export function selectIntersectionFeedback(
  context: IntersectionFeedbackContext,
): IntersectionFeedback {
  if (context.correct) return { kind: "correct" };
  const nearest = context.nearestKnown;
  const groups = context.orderedGroups ?? [];

  // Zero-point guesses may receive area context, but never road-specific advice.
  if (nearest && context.score > 0) {
    const sharedStreetId = context.target.streetIds.find((streetId) =>
      nearest.streetIds.includes(streetId),
    );
    if (sharedStreetId) {
      const resolvedCrossing = nearest.streetIds.find((streetId) => streetId !== sharedStreetId);
      const targetCrossing = context.target.streetIds.find((streetId) => streetId !== sharedStreetId);
      const relation =
        resolvedCrossing && targetCrossing
          ? orderedRelation(resolvedCrossing, targetCrossing, groups)
          : null;
      return {
        kind: "same-road",
        sharedStreetId,
        resolvedIntersectionId: nearest.id,
        ...(relation ?? {}),
      };
    }

    for (const resolvedStreetId of nearest.streetIds) {
      for (const targetStreetId of context.target.streetIds) {
        const relation = orderedRelation(resolvedStreetId, targetStreetId, groups);
        if (relation) {
          return {
            kind: "ordered-crossing",
            resolvedStreetId,
            targetStreetId,
            ...relation,
          };
        }
      }
    }
  }

  if (context.target.areaId) {
    return {
      kind: "area-direction",
      areaId: context.target.areaId,
      direction: targetDirectionFromGuess(context.guess, context.target.coordinate),
    };
  }
  if (nearest) return { kind: "nearest-known", intersectionId: nearest.id };
  return { kind: "distance", score: context.score as Exclude<LearningScore, 4> };
}

export type StreetFeedback =
  | { kind: "correct" }
  | {
      kind: "ordered-neighbor";
      nearestStreetId: string;
      direction: CardinalDirection;
    }
  | {
      kind: "ordered-direction";
      nearestStreetId: string;
      direction: CardinalDirection;
      streetCount: number;
    }
  | { kind: "general-direction"; direction: CardinalDirection }
  | { kind: "shape-nearest"; nearestStreetId: string }
  | {
      kind: "shape-area-direction";
      areaId: string;
      direction: CardinalDirection;
    }
  | { kind: "distance"; score: Exclude<LearningScore, 4> };

export type StreetFeedbackContext = {
  correct: boolean;
  score: LearningScore;
  targetStreetId: string;
  group: FeedbackStreetGroup;
  nearestEligibleStreetId?: string;
  nearestStreetIsTrustworthy?: boolean;
  targetAreaId?: string;
  targetDirectionFromGuess?: CardinalDirection;
};

export function selectStreetFeedback(context: StreetFeedbackContext): StreetFeedback {
  if (context.correct) return { kind: "correct" };

  if (context.group.kind === "ordered") {
    if (context.nearestEligibleStreetId) {
      const relation = orderedRelation(
        context.nearestEligibleStreetId,
        context.targetStreetId,
        [context.group],
      );
      if (relation?.streetCount === 1) {
        return {
          kind: "ordered-neighbor",
          nearestStreetId: context.nearestEligibleStreetId,
          direction: relation.direction,
        };
      }
      if (relation) {
        return {
          kind: "ordered-direction",
          nearestStreetId: context.nearestEligibleStreetId,
          ...relation,
        };
      }
    }
    if (context.targetDirectionFromGuess) {
      return { kind: "general-direction", direction: context.targetDirectionFromGuess };
    }
    return { kind: "distance", score: context.score as Exclude<LearningScore, 4> };
  }

  if (
    context.nearestEligibleStreetId &&
    context.nearestStreetIsTrustworthy === true
  ) {
    return { kind: "shape-nearest", nearestStreetId: context.nearestEligibleStreetId };
  }
  if (context.targetAreaId && context.targetDirectionFromGuess) {
    return {
      kind: "shape-area-direction",
      areaId: context.targetAreaId,
      direction: context.targetDirectionFromGuess,
    };
  }
  return { kind: "distance", score: context.score as Exclude<LearningScore, 4> };
}
