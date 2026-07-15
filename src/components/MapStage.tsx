import { useEffect, useRef, useState } from "react";
import type { Coordinate, Intersection } from "../data";
import type {
  HighlightedStreet,
  MapAdapter,
  StreetFeatureCollection,
} from "../map";
import { createMapLibreMapAdapter } from "../map";

export type MapStageProps = {
  guess: { coordinate: Coordinate } | null;
  intersections?: readonly Intersection[];
  onGuess: (coordinate: Coordinate) => void;
  onNext: () => void;
  question: {
    id: string;
    answer?: Intersection;
  };
  result: { isCorrect?: boolean } | null;
  highlightedStreets?: readonly HighlightedStreet[];
  nextLabel?: string;
  pendingGuess?: Coordinate | null;
  onPendingGuessChange?: (coordinate: Coordinate | null) => void;
  resultDescription?: string;
  streetGeometry?: StreetFeatureCollection;
};

export function MapStage({
  guess,
  intersections,
  onGuess,
  onNext,
  question,
  result,
  highlightedStreets,
  nextLabel = "Next intersection",
  pendingGuess: restoredPendingGuess,
  onPendingGuessChange,
  resultDescription,
  streetGeometry,
}: MapStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [localPendingGuess, setLocalPendingGuess] = useState<Coordinate | null>(null);
  const revealed = Boolean(result);
  const onGuessRef = useRef(onGuess);
  const onPendingGuessChangeRef = useRef(onPendingGuessChange);
  const revealedRef = useRef(revealed);
  const coarsePointerRef = useRef(isCoarsePointer);
  const promptIdRef = useRef(question.id);
  const pendingGuess = restoredPendingGuess === undefined
    ? localPendingGuess
    : restoredPendingGuess;

  useEffect(() => {
    onGuessRef.current = onGuess;
  }, [onGuess]);

  useEffect(() => {
    onPendingGuessChangeRef.current = onPendingGuessChange;
  }, [onPendingGuessChange]);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    coarsePointerRef.current = isCoarsePointer;
  }, [isCoarsePointer]);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const updatePointerCapability = () => setIsCoarsePointer(pointerQuery.matches);
    updatePointerCapability();
    pointerQuery.addEventListener("change", updatePointerCapability);
    return () => pointerQuery.removeEventListener("change", updatePointerCapability);
  }, []);

  useEffect(() => {
    if (promptIdRef.current === question.id) return;
    promptIdRef.current = question.id;
    setLocalPendingGuess(null);
    onPendingGuessChange?.(null);
  }, [onPendingGuessChange, question.id]);

  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = createMapLibreMapAdapter({
      onGuess: ({ coordinate }) => {
        if (revealedRef.current) return;

        if (coarsePointerRef.current) {
          setLocalPendingGuess(coordinate);
          onPendingGuessChangeRef.current?.(coordinate);
          return;
        }

        onGuessRef.current(coordinate);
      }
    });
    adapter.mount(containerRef.current);
    adapterRef.current = adapter;

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, []);

  useEffect(() => {
    adapterRef.current?.update({
      intersections,
      promptId: question.id,
      correctIntersection: question.answer,
      correctGuess: Boolean(result?.isCorrect),
      revealed,
      pendingGuess: revealed ? undefined : pendingGuess ?? undefined,
      streetGeometry,
      highlightedStreets,
      markers: guess
        ? [
            {
              id: `guess-${question.id}`,
              coordinate: guess.coordinate,
              kind: "guess",
              label: "Guess"
            }
          ]
        : []
    });
  }, [guess, highlightedStreets, intersections, pendingGuess, question, revealed, streetGeometry]);

  const confirmPendingGuess = () => {
    if (!pendingGuess || revealed) return;
    onGuess(pendingGuess);
    setLocalPendingGuess(null);
    onPendingGuessChange?.(null);
  };

  const guessingInstruction = isCoarsePointer
    ? pendingGuess
      ? "Guess staged. Tap elsewhere to move it, or confirm."
      : "Tap the map to stage your guess."
    : "Click the map to guess.";

  return (
    <div className="map-stage">
      <div
        ref={containerRef}
        className="map-stage-canvas"
        role="region"
        aria-label="Interactive Las Vegas map"
      />
      <p className="map-stage-announcement" aria-live="polite">
        {revealed
          ? resultDescription ?? "Answer revealed. Review the result outside the map."
          : guessingInstruction}
      </p>
      {revealed ? (
        <button
          type="button"
          className="map-stage-status map-stage-status-action"
          onClick={onNext}
        >
          {nextLabel}
        </button>
      ) : (
        <div className="map-stage-status" aria-live="polite">
          {guessingInstruction}
        </div>
      )}
      {isCoarsePointer && !revealed ? (
        <button
          type="button"
          className="map-stage-confirm"
          disabled={!pendingGuess}
          onClick={confirmPendingGuess}
        >
          Confirm guess
        </button>
      ) : null}
    </div>
  );
}
