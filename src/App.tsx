import { intersections } from "./data";
import { AppShell } from "./components/AppShell";
import { AreaChooser } from "./components/AreaChooser";
import { Button } from "./components/Button";
import { GamePanel } from "./components/GamePanel";
import { MapStage } from "./components/MapStage";
import { ProgressBar } from "./components/ProgressBar";
import { QuestionPrompt } from "./components/QuestionPrompt";
import { ResultSummary } from "./components/ResultSummary";
import { useGameLoop } from "./state/gameLoop";

export default function App() {
  const {
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
  } = useGameLoop(intersections);

  return (
    <AppShell
      sidebar={
        <GamePanel
          header={
            <>
              <AreaChooser
                areaOptions={areaOptions}
                selectedAreaId={selectedAreaId}
                onAreaChange={selectArea}
              />
              <QuestionPrompt
                question={currentQuestion}
                isRevealed={Boolean(result)}
                selectedAreaLabel={selectedAreaLabel}
              />
            </>
          }
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
            intersections={activeIntersections}
            question={currentQuestion}
            result={result}
          />
        </GamePanel>
      }
    >
      <MapStage
        intersections={activeIntersections}
        question={currentQuestion}
        guess={currentGuess}
        result={result}
        onGuess={guessIntersection}
        onNext={nextQuestion}
      />
    </AppShell>
  );
}
