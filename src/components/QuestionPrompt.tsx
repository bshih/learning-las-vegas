import type { IntersectionQuestion } from "../data";

type QuestionPromptProps = {
  isRevealed: boolean;
  question: IntersectionQuestion;
  selectedAreaLabel: string;
};

export function QuestionPrompt({
  isRevealed,
  question,
  selectedAreaLabel,
}: QuestionPromptProps) {
  return (
    <section className="question-prompt">
      <p className="prompt-label">{isRevealed ? "Result" : "Find this intersection"}</p>
      <h1>{question.prompt}</h1>
      <p className="prompt-meta">
        Question {question.sequence + 1} / {selectedAreaLabel}
      </p>
    </section>
  );
}
