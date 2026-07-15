import { useEffect, useMemo, useState } from "react";
import {
  ALL_AREA_ID,
  filterIntersectionsByArea,
  findStreetDefinition,
  getAreaBucketLabel,
  getAreaOptions,
  getStreetDefinition,
  getStreetGeometry,
  getStreetGroup,
  isPlayAreaId,
  streetGeometry,
  streetGroups,
} from "../data";
import type {
  Coordinate,
  Intersection,
  PlayAreaId,
  StreetDefinition,
} from "../data";
import {
  buildIntersectionSessionItemIds,
  buildStreetSessionItemIds,
  scoreGuess,
  scoreStreetGuess,
  selectIntersectionFeedback,
  selectIntersectionFocusItems,
  selectStreetFeedback,
  selectStreetFocusItems,
} from "../lib";
import type {
  FeedbackIntersection,
  FeedbackStreetGroup,
  IntersectionFeedback,
  IntersectionScoreResult,
  ScorableStreet,
  SessionAttempt,
  StreetFeedback,
  StreetScoreResult,
} from "../lib";

const STORAGE_KEY = "melissa-map-progress-v2";
const LEGACY_STORAGE_KEY = "melissa-map-progress-v1";

export type GameMode = "intersections" | "streets";
export type GameScreen = "setup" | "briefing" | "playing" | "summary";

type StoredAttempt = SessionAttempt & { coordinate: Coordinate };

type ActiveSession = {
  id: string;
  mode: GameMode;
  scopeId: string;
  focusItemIds: string[];
  repeatItemIds: string[];
  currentIndex: number;
  attempts: StoredAttempt[];
  pendingGuess: Coordinate | null;
};

type ScopeSummary = {
  sessionsCompleted: number;
  bestScore: number;
};

export type LastSession = {
  mode: GameMode;
  scopeId: string;
  score: number;
  missedItemIds: string[];
  correctItemIds: string[];
  isNewBest: boolean;
};

type LocalProgress = {
  version: 2;
  screen: GameScreen;
  selectedMode: GameMode;
  selectedAreaId: PlayAreaId;
  selectedStreetGroupId: string;
  scopes: Record<string, ScopeSummary>;
  activeSession?: ActiveSession;
  lastSession?: LastSession;
};

export type IntersectionRoundResult = {
  mode: "intersections";
  result: IntersectionScoreResult;
  feedback: IntersectionFeedback;
};

export type StreetRoundResult = {
  mode: "streets";
  result: StreetScoreResult;
  feedback: StreetFeedback;
};

export type RoundResult = IntersectionRoundResult | StreetRoundResult;

const DEFAULT_STREET_GROUP_ID = streetGroups[0]?.id ?? "special-shapes";

export function useLearningGame(intersections: readonly Intersection[]) {
  const [progress, setProgress] = useState<LocalProgress>(() => loadProgress());
  const activeSession = progress.activeSession;
  const selectedAreaId = progress.selectedAreaId;
  const selectedStreetGroupId = progress.selectedStreetGroupId;
  const areaOptions = useMemo(() => getAreaOptions(intersections), [intersections]);
  const activeIntersections = useMemo(
    () => filterIntersectionsByArea(intersections, selectedAreaId),
    [intersections, selectedAreaId],
  );
  const selectedStreetGroup = getStreetGroup(selectedStreetGroupId) ?? streetGroups[0];
  const schedule = activeSession
    ? [...activeSession.focusItemIds, ...activeSession.repeatItemIds]
    : [];
  const currentItemId = activeSession ? schedule[activeSession.currentIndex] : undefined;
  const currentIntersection =
    activeSession?.mode === "intersections"
      ? intersections.find((item) => item.id === currentItemId)
      : undefined;
  const currentStreet =
    activeSession?.mode === "streets" && currentItemId
      ? getStreetDefinition(currentItemId)
      : undefined;
  const currentAttempt = activeSession?.attempts[activeSession.currentIndex];
  const currentResult = useMemo(
    () => deriveResult(activeSession, currentAttempt, currentIntersection, currentStreet, activeIntersections),
    [activeIntersections, activeSession, currentAttempt, currentIntersection, currentStreet],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function selectMode(mode: GameMode) {
    setProgress((current) => ({ ...current, selectedMode: mode, screen: "setup" }));
  }

  function selectArea(areaId: PlayAreaId) {
    setProgress((current) => ({ ...current, selectedAreaId: areaId }));
  }

  function selectStreetGroup(groupId: string) {
    if (!getStreetGroup(groupId)) return;
    setProgress((current) => ({ ...current, selectedStreetGroupId: groupId }));
  }

  function startSession(options: { retryMisses?: boolean } = {}) {
    const mode = progress.selectedMode;
    const scopeId = mode === "streets" ? selectedStreetGroupId : selectedAreaId;
    const scopeKey = getScopeKey(mode, scopeId);
    const summary = progress.scopes[scopeKey] ?? { sessionsCompleted: 0, bestScore: 0 };
    const retryMissItemIds =
      options.retryMisses &&
      progress.lastSession?.mode === mode &&
      progress.lastSession.scopeId === scopeId
        ? progress.lastSession.missedItemIds
        : [];
    const focusItemIds =
      mode === "streets"
        ? selectStreetFocusItems(selectedStreetGroup?.streetIds ?? [], {
            scopeId,
            completedSessionCount: summary.sessionsCompleted,
            retryMissItemIds,
          })
        : selectIntersectionFocusItems(activeIntersections.map((item) => item.id), {
            scopeId,
            completedSessionCount: summary.sessionsCompleted,
            retryMissItemIds,
          });
    const session: ActiveSession = {
      id: `${mode}:${scopeId}:${summary.sessionsCompleted + 1}`,
      mode,
      scopeId,
      focusItemIds,
      repeatItemIds: mode === "streets" ? [...focusItemIds] : [],
      currentIndex: 0,
      attempts: [],
      pendingGuess: null,
    };
    setProgress((current) => ({
      ...current,
      activeSession: session,
      lastSession: undefined,
      screen: mode === "streets" ? "briefing" : "playing",
    }));
  }

  function startPractice() {
    setProgress((current) => ({ ...current, screen: "playing" }));
  }

  function setPendingGuess(coordinate: Coordinate | null) {
    setProgress((current) =>
      current.activeSession
        ? {
            ...current,
            activeSession: { ...current.activeSession, pendingGuess: coordinate },
          }
        : current,
    );
  }

  function submitCoordinate(coordinate: Coordinate) {
    if (!activeSession || currentAttempt || progress.screen !== "playing") return;
    const scored = scoreCurrent(activeSession, coordinate, currentIntersection, currentStreet, activeIntersections);
    setProgress((current) => {
      const session = current.activeSession;
      if (!session || session.attempts[session.currentIndex]) return current;
      const attempts = [...session.attempts, { ...scored, coordinate }];
      let repeatItemIds = session.repeatItemIds;
      if (session.mode === "streets" && session.currentIndex === 4) {
        repeatItemIds = buildStreetSessionItemIds(session.focusItemIds, attempts).slice(5);
      }
      if (session.mode === "intersections" && session.currentIndex === 7) {
        repeatItemIds = buildIntersectionSessionItemIds(session.focusItemIds, attempts).slice(8);
      }
      return {
        ...current,
        activeSession: { ...session, attempts, repeatItemIds, pendingGuess: null },
      };
    });
  }

  function submitKeyboardStreet(streetId: string) {
    const feature = getStreetGeometry(streetId);
    if (!feature) return;
    const position =
      feature.geometry.type === "LineString"
        ? feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)]
        : feature.geometry.coordinates[0]?.[
            Math.floor((feature.geometry.coordinates[0]?.length ?? 1) / 2)
          ];
    if (position) submitCoordinate({ lon: position[0], lat: position[1] });
  }

  function nextPrompt() {
    if (!activeSession || !currentAttempt) return;
    if (activeSession.currentIndex < 9) {
      setProgress((current) =>
        current.activeSession
          ? {
              ...current,
              activeSession: {
                ...current.activeSession,
                currentIndex: current.activeSession.currentIndex + 1,
                pendingGuess: null,
              },
            }
          : current,
      );
      return;
    }
    finishSession();
  }

  function finishSession() {
    setProgress((current) => {
      const session = current.activeSession;
      if (!session || session.attempts.length !== 10) return current;
      const score = session.attempts.reduce((total, attempt) => total + attempt.score, 0);
      const missedItemIds = [...new Set(session.attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.itemId))];
      const correctItemIds = [...new Set(session.attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.itemId))];
      const scopeKey = getScopeKey(session.mode, session.scopeId);
      const previous = current.scopes[scopeKey] ?? { sessionsCompleted: 0, bestScore: 0 };
      const isNewBest = score > previous.bestScore;
      return {
        ...current,
        screen: "summary",
        activeSession: undefined,
        scopes: {
          ...current.scopes,
          [scopeKey]: {
            sessionsCompleted: previous.sessionsCompleted + 1,
            bestScore: Math.max(previous.bestScore, score),
          },
        },
        lastSession: {
          mode: session.mode,
          scopeId: session.scopeId,
          score,
          missedItemIds,
          correctItemIds,
          isNewBest,
        },
      };
    });
  }

  function returnToSetup() {
    setProgress((current) => ({ ...current, screen: "setup", activeSession: undefined }));
  }

  return {
    activeIntersections,
    activeSession,
    areaOptions,
    currentAttempt,
    currentIntersection,
    currentItemId,
    currentResult,
    currentStreet,
    lastSession: progress.lastSession,
    progress,
    schedule,
    selectedAreaId,
    selectedAreaLabel: getAreaBucketLabel(selectedAreaId),
    selectedStreetGroup,
    selectedStreetGroupId,
    streetGeometry,
    streetGroups,
    nextPrompt,
    returnToSetup,
    selectArea,
    selectMode,
    selectStreetGroup,
    setPendingGuess,
    startPractice,
    startSession,
    submitCoordinate,
    submitKeyboardStreet,
  };
}

function scoreCurrent(
  session: ActiveSession,
  coordinate: Coordinate,
  intersection: Intersection | undefined,
  street: StreetDefinition | undefined,
  activeIntersections: readonly Intersection[],
): SessionAttempt {
  if (session.mode === "intersections" && intersection) {
    const result = scoreGuess(intersection, coordinate, activeIntersections);
    return { itemId: intersection.id, score: result.closenessScore, correct: result.isCorrect };
  }
  if (session.mode === "streets" && street) {
    const result = scoreStreetGuess(street.id, coordinate, getStreetPool(session.scopeId));
    return { itemId: street.id, score: result.score, correct: result.correct };
  }
  throw new Error("Session item is missing from its data source.");
}

function deriveResult(
  session: ActiveSession | undefined,
  attempt: StoredAttempt | undefined,
  intersection: Intersection | undefined,
  street: StreetDefinition | undefined,
  activeIntersections: readonly Intersection[],
): RoundResult | null {
  if (!session || !attempt) return null;
  if (session.mode === "intersections" && intersection) {
    const result = scoreGuess(intersection, attempt.coordinate, activeIntersections);
    const feedback = selectIntersectionFeedback({
      correct: result.isCorrect,
      score: result.closenessScore,
      target: toFeedbackIntersection(intersection),
      guess: attempt.coordinate,
      nearestKnown: toFeedbackIntersection(result.nearestIntersection),
      orderedGroups: streetGroups.filter((group) => group.kind === "ordered"),
    });
    return { mode: "intersections", result, feedback };
  }
  if (session.mode === "streets" && street) {
    const result = scoreStreetGuess(street.id, attempt.coordinate, getStreetPool(session.scopeId));
    const group = getStreetGroup(session.scopeId);
    if (!group) return null;
    const feedback = selectStreetFeedback({
      correct: result.correct,
      score: result.score,
      targetStreetId: street.id,
      group: group as FeedbackStreetGroup,
      nearestEligibleStreetId: result.nearestEligibleStreet.id,
      nearestStreetIsTrustworthy: true,
      targetAreaId: street.areaIds[0],
    });
    return { mode: "streets", result, feedback };
  }
  return null;
}

function getStreetPool(groupId: string): ScorableStreet[] {
  const group = getStreetGroup(groupId);
  if (!group) return [];
  return group.streetIds.flatMap((streetId) => {
    const definition = getStreetDefinition(streetId);
    const feature = getStreetGeometry(streetId);
    return definition && feature
      ? [{
          id: streetId,
          name: definition.name,
          axis: group.kind === "shape" ? "regional" as const : definition.axis,
          geometry: feature.geometry,
        }]
      : [];
  });
}

function toFeedbackIntersection(intersection: Intersection): FeedbackIntersection {
  return {
    id: intersection.id,
    streetIds: [
      findStreetDefinition(intersection.primaryStreet)?.id ?? intersection.primaryStreet,
      findStreetDefinition(intersection.crossStreet)?.id ?? intersection.crossStreet,
    ],
    coordinate: intersection.coordinate,
    areaId: intersection.area,
  };
}

function getScopeKey(mode: GameMode, scopeId: string) {
  return `${mode}:${scopeId}`;
}

function loadProgress(): LocalProgress {
  const fallback: LocalProgress = {
    version: 2,
    screen: "setup",
    selectedMode: "intersections",
    selectedAreaId: loadLegacyArea(),
    selectedStreetGroupId: DEFAULT_STREET_GROUP_ID,
    scopes: {},
  };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<LocalProgress>;
    return {
      ...fallback,
      ...parsed,
      version: 2,
      selectedAreaId: isPlayAreaId(parsed.selectedAreaId) ? parsed.selectedAreaId : fallback.selectedAreaId,
      selectedStreetGroupId: getStreetGroup(parsed.selectedStreetGroupId ?? "")
        ? parsed.selectedStreetGroupId!
        : fallback.selectedStreetGroupId,
      scopes: parsed.scopes ?? {},
    };
  } catch {
    return fallback;
  }
}

function loadLegacyArea(): PlayAreaId {
  try {
    const stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) return ALL_AREA_ID;
    const areaId = (JSON.parse(stored) as { areaId?: string }).areaId;
    return isPlayAreaId(areaId) ? areaId : ALL_AREA_ID;
  } catch {
    return ALL_AREA_ID;
  }
}
