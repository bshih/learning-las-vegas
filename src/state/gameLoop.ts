import { useEffect, useMemo, useState } from "react";
import type { Coordinate, Guess, Intersection } from "../data";
import { getQuestionAt, scoreGuess } from "../lib";
import type { ProgressState } from "./types";

const STORAGE_KEY = "melissa-map-progress-v1";
const MISS_THRESHOLD_METERS = 1609.344;

const initialProgress: ProgressState = {
  answered: 0,
  missed: 0,
  streak: 0,
  questionIndex: 0
};

export function useGameLoop(intersections: readonly Intersection[]) {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [currentGuess, setCurrentGuess] = useState<Guess | null>(null);
  const [result, setResult] = useState<Guess | null>(null);

  const currentQuestion = useMemo(() => {
    const question = getQuestionAt(intersections, progress.questionIndex);
    if (!question) {
      throw new Error("Melissa Map needs at least one intersection question.");
    }
    return question;
  }, [intersections, progress.questionIndex]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function guessIntersection(coordinate: Coordinate) {
    if (result) return;

    const guess = scoreGuess(currentQuestion.answer, coordinate);
    const missed = guess.distanceMeters > MISS_THRESHOLD_METERS;

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
    setProgress(initialProgress);
  }

  return {
    currentQuestion,
    currentGuess,
    progress,
    result,
    guessIntersection,
    nextQuestion,
    resetProgress
  };
}

function loadProgress(): ProgressState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialProgress;
    const parsed = JSON.parse(stored) as Partial<ProgressState>;

    return {
      answered: typeof parsed.answered === "number" ? parsed.answered : 0,
      missed: typeof parsed.missed === "number" ? parsed.missed : 0,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      questionIndex: typeof parsed.questionIndex === "number" ? parsed.questionIndex : 0
    };
  } catch {
    return initialProgress;
  }
}
