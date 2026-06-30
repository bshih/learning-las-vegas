import type { Guess, Intersection, IntersectionQuestion } from "../data";
import { getRoadFeedback } from "../lib/roadFeedback";

type ResultSummaryProps = {
  intersections: readonly Intersection[];
  question: IntersectionQuestion;
  result: Guess | null;
};

export function ResultSummary({ intersections, question, result }: ResultSummaryProps) {
  if (!result) {
    return (
      <section className="result-summary result-empty">
        <p>Make a guess to reveal the answer and distance.</p>
      </section>
    );
  }

  const roadFeedback = getRoadFeedback(question.answer, result.coordinate, intersections);

  return (
    <section className="result-summary" aria-live="polite">
      <div>
        <p className="result-rating">{getRating(result.distanceMeters)}</p>
        <p className="result-distance">
          {(result.distanceMeters / 1609.344).toFixed(2)} mi /{" "}
          {Math.round(result.distanceMeters)} m away
        </p>
      </div>
      <dl className="result-details">
        <div>
          <dt>Region</dt>
          <dd>{question.answer.area ?? "Las Vegas valley"}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{result.score}/100</dd>
        </div>
      </dl>
      {roadFeedback ? <p className="road-feedback">{roadFeedback}</p> : null}
      {question.answer.notes ? <p className="teaching-note">{question.answer.notes}</p> : null}
    </section>
  );
}

function getRating(distanceMeters: number) {
  if (distanceMeters <= 250) return "Bullseye";
  if (distanceMeters <= 800) return "Close";
  if (distanceMeters <= 1609.344) return "In the neighborhood";
  if (distanceMeters <= 4000) return "Needs calibration";
  return "Lost in the valley";
}
