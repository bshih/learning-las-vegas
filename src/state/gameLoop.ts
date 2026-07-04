import { useEffect, useMemo, useState } from "react";
import {
  ALL_AREA_ID,
  filterIntersectionsByArea,
  getAreaBucketLabel,
  getAreaOptions,
  isPlayAreaId,
} from "../data";
import type { Coordinate, Guess, Intersection, PlayAreaId } from "../data";
import { getQuestionAt, scoreGuess } from "../lib";
import type { ProgressState } from "./types";

const STORAGE_KEY = "melissa-map-progress-v1";

function createInitialProgress(areaId: PlayAreaId = ALL_AREA_ID): ProgressState {
  return {
    areaId,
    answered: 0,
    missed: 0,
    streak: 0,
    questionIndex: 0
  };
}

const initialProgress = createInitialProgress();

export function useGameLoop(intersections: readonly Intersection[]) {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [currentGuess, setCurrentGuess] = useState<Guess | null>(null);
  const [result, setResult] = useState<Guess | null>(null);
  const selectedAreaId = progress.areaId;
  const activeIntersections = useMemo(
    () => filterIntersectionsByArea(intersections, selectedAreaId),
    [intersections, selectedAreaId]
  );
  const areaOptions = useMemo(() => getAreaOptions(intersections), [intersections]);
  const selectedAreaLabel = useMemo(
    () => getAreaBucketLabel(selectedAreaId),
    [selectedAreaId]
  );

  const currentQuestion = useMemo(() => {
    const question = getQuestionAt(activeIntersections, progress.questionIndex, {
      seed: `melissa-map-v1:${selectedAreaId}`
    });
    if (!question) {
      throw new Error("Melissa Map needs at least one intersection question.");
    }
    return question;
  }, [activeIntersections, progress.questionIndex, selectedAreaId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function selectArea(areaId: PlayAreaId) {
    setCurrentGuess(null);
    setResult(null);
    setProgress(createInitialProgress(areaId));
  }

  function guessIntersection(coordinate: Coordinate) {
    if (result) return;

    const guess = scoreGuess(currentQuestion.answer, coordinate, activeIntersections);
    const missed = !guess.isCorrect;

    setCurrentGuess(guess);
    setResult(guess);
    setProgress((current) => ({
      ...current,
      answered: current.answered + 1,
      missed: current.missed + (missed ? 1 : 0),
      streak: missed ? 0 : current.streak + 1
    }));
  }

  function nextQuestion() {
    setCurrentGuess(null);
    setResult(null);
    setProgress((current) => ({
      ...current,
      questionIndex: current.questionIndex + 1
    }));
  }

  function resetProgress() {
    setCurrentGuess(null);
    setResult(null);
    setProgress((current) => createInitialProgress(current.areaId));
  }

  return {
    activeIntersections,
    areaOptions,
    currentQuestion,
    currentGuess,
    progress,
    result,
    selectedAreaId,
    selectedAreaLabel,
    guessIntersection,
    nextQuestion,
    resetProgress,
    selectArea
  };
}

function loadProgress(): ProgressState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialProgress;
    const parsed = JSON.parse(stored) as Partial<ProgressState>;
    const areaId = isPlayAreaId(parsed.areaId) ? parsed.areaId : ALL_AREA_ID;

    return {
      areaId,
      answered: typeof parsed.answered === "number" ? parsed.answered : 0,
      missed: typeof parsed.missed === "number" ? parsed.missed : 0,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      questionIndex: typeof parsed.questionIndex === "number" ? parsed.questionIndex : 0
    };
  } catch {
    return initialProgress;
  }
}
