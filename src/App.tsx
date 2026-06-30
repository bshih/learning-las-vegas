import { intersections } from "./data";
import { AppShell } from "./components/AppShell";
import { Button } from "./components/Button";
import { GamePanel } from "./components/GamePanel";
import { MapStage } from "./components/MapStage";
import { ProgressBar } from "./components/ProgressBar";
import { QuestionPrompt } from "./components/QuestionPrompt";
import { ResultSummary } from "./components/ResultSummary";
import { useGameLoop } from "./state/gameLoop";

export default function App() {
  const {
    currentQuestion,
    currentGuess,
    progress,
    result,
    guessIntersection,
    nextQuestion,
    resetProgress
  } = useGameLoop(intersections);

  return (
    <AppShell
      sidebar={
        <GamePanel
          header={<QuestionPrompt question={currentQuestion} isRevealed={Boolean(result)} />}
          footer={
            <div className="button-row">
              <Button onClick={nextQuestion} disabled={!result}>
                Next
              </Button>
              <Button onClick={resetProgress} variant="secondary">
                Reset
              </Button>
            </div>
          }
        >
          <ProgressBar progress={progress} />
          <ResultSummary
            intersections={intersections}
            question={currentQuestion}
            result={result}
          />
        </GamePanel>
      }
    >
      <MapStage
        intersections={intersections}
        question={currentQuestion}
        guess={currentGuess}
        result={result}
        onGuess={guessIntersection}
      />
    </AppShell>
  );
}
