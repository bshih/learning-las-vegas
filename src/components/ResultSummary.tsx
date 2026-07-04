import { getAreaBucketLabel } from "../data";
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
        <p>Make a guess to reveal the answer.</p>
      </section>
    );
  }

  const roadFeedback = getRoadFeedback(question.answer, result.coordinate, intersections);
  const nearestPrompt = `${result.nearestIntersection.primaryStreet} & ${result.nearestIntersection.crossStreet}`;
  const areaLabel = question.answer.area
    ? getAreaBucketLabel(question.answer.area)
    : question.answer.region ?? "Las Vegas valley";

  return (
    <section className="result-summary" aria-live="polite">
      <div>
        <p className="result-rating">{getRating(result)}</p>
        <p className="result-distance">
          {result.isCorrect
            ? `Snapped to: ${nearestPrompt}`
            : `Resolved as: ${nearestPrompt}`}
        </p>
      </div>
      <dl className="result-details">
        <div>
          <dt>Region</dt>
          <dd>{areaLabel}</dd>
        </div>
        <div>
          <dt>Result</dt>
          <dd>{result.isCorrect ? "Correct" : "Missed"}</dd>
        </div>
        <div>
          <dt>Points</dt>
          <dd>{result.closenessScore}/5</dd>
        </div>
      </dl>
      {!result.isCorrect && roadFeedback ? <p className="road-feedback">{roadFeedback}</p> : null}
      {question.answer.notes ? <p className="teaching-note">{question.answer.notes}</p> : null}
    </section>
  );
}

function getRating(result: Guess) {
  if (result.isCorrect) return "Correct";
  if (result.closenessScore === 4) return "Close, but not that intersection";
  if (result.closenessScore === 3) return "In the area";
  if (result.closenessScore === 2) return "Farther out";
  return "Try the road order again";
}
