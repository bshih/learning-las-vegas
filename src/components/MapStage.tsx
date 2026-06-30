import { useEffect, useRef } from "react";
import type { Guess, Intersection, IntersectionQuestion } from "../data";
import type { MapAdapter } from "../map";
import { createCoordinateMapAdapter } from "../map";

type MapStageProps = {
  guess: Guess | null;
  intersections: readonly Intersection[];
  onGuess: (coordinate: Guess["coordinate"]) => void;
  question: IntersectionQuestion;
  result: Guess | null;
};

export function MapStage({
  guess,
  intersections,
  onGuess,
  question,
  result
}: MapStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const revealed = Boolean(result);
  const onGuessRef = useRef(onGuess);
  const revealedRef = useRef(revealed);

  useEffect(() => {
    onGuessRef.current = onGuess;
  }, [onGuess]);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = createCoordinateMapAdapter({
      onGuess: ({ coordinate }) => {
        if (!revealedRef.current) {
          onGuessRef.current(coordinate);
        }
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
      correctIntersection: question.answer,
      revealed,
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
  }, [guess, intersections, question, revealed]);

  return (
    <div className="map-stage">
      <div ref={containerRef} className="map-stage-canvas" />
      <div className="map-stage-status" aria-live="polite">
        {revealed ? "Answer shown. Hit Next to continue." : "Click the map to guess."}
      </div>
    </div>
  );
}
