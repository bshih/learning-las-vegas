import { AppShell } from "./components/AppShell";
import { AreaChooser } from "./components/AreaChooser";
import { Button } from "./components/Button";
import { GamePanel } from "./components/GamePanel";
import { MapStage } from "./components/MapStage";
import {
  getAreaBucketLabel,
  getStreetDefinition,
  intersections,
  isPlayAreaId,
  streetDefinitions,
} from "./data";
import type { Intersection } from "./data";
import type { HighlightedStreet } from "./map";
import { useLearningGame } from "./state/learningGame";
import type { RoundResult } from "./state/learningGame";

export default function App() {
  const game = useLearningGame(intersections);
  const { activeSession, currentResult, currentStreet, currentIntersection, progress } = game;

  if (progress.screen === "setup") {
    return (
      <AppShell
        sidebar={
          <GamePanel
            header={
              <>
                <p className="panel-kicker">Choose a mode</p>
                <h1 className="panel-title">Think you know the valley?</h1>
              </>
            }
            footer={<Button onClick={() => game.startSession()}>Start the round</Button>}
          >
            <ModeChooser selected={progress.selectedMode} onChange={game.selectMode} />
            {progress.selectedMode === "intersections" ? (
              <AreaChooser
                areaOptions={game.areaOptions}
                selectedAreaId={game.selectedAreaId}
                onAreaChange={game.selectArea}
              />
            ) : (
              <section className="street-pool-card">
                <span>Street pool</span>
                <strong>{streetDefinitions.length} major roads</strong>
                <p>Every round pulls 10 roads from across the valley.</p>
              </section>
            )}
            <ModeCard mode={progress.selectedMode} />
          </GamePanel>
        }
      >
        <MapPlaceholder />
      </AppShell>
    );
  }

  if (progress.screen === "summary" && game.lastSession) {
    const missedNames = game.lastSession.missedItemIds.map((id) => itemName(id));
    return (
      <AppShell
        sidebar={
          <GamePanel
            header={
              <>
                <p className="panel-kicker">Round complete</p>
                <h1 className="score-title">{game.lastSession.score}<span>/40</span></h1>
                <p className="panel-lede">
                  {game.lastSession.isNewBest ? "New high score for this mode." : scoreMessage(game.lastSession.score)}
                </p>
              </>
            }
            footer={
              <div className="button-stack">
                {missedNames.length ? (
                  <Button onClick={() => game.startSession({ retryMisses: true })}>Replay the misses</Button>
                ) : null}
                <Button variant={missedNames.length ? "secondary" : "primary"} onClick={() => game.startSession()}>
                  Go another 10
                </Button>
                <Button variant="secondary" onClick={game.returnToSetup}>Switch mode</Button>
              </div>
            }
          >
            <section className="summary-card">
              <p className="summary-label">{game.lastSession.mode === "streets" ? "Roads" : "Intersections"} that got away</p>
              {missedNames.length ? (
                <ul className="miss-list">{missedNames.map((name) => <li key={name}>{name}</li>)}</ul>
              ) : (
                <p className="clean-run">Clean sweep — you found every one.</p>
              )}
            </section>
          </GamePanel>
        }
      >
        <MapPlaceholder message="Nice lap. Go again or chase down the ones that got away." />
      </AppShell>
    );
  }

  if (!activeSession) return null;

  const promptId = `${activeSession.id}:${activeSession.currentIndex}`;
  const attempts = activeSession.attempts;
  const score = attempts.reduce((total, attempt) => total + attempt.score, 0);
  const modeLabel = activeSession.mode === "streets" ? "Find the street" : "Find the intersection";
  const prompt = currentStreet?.name ?? intersectionName(currentIntersection);
  const highlights = buildHighlights(currentResult, currentStreet?.id);
  const guess = currentResult && activeSession.attempts[activeSession.currentIndex]
    ? { coordinate: activeSession.attempts[activeSession.currentIndex].coordinate }
    : null;
  const resultDescription = currentResult ? feedbackText(currentResult) : undefined;

  return (
    <AppShell
      sidebar={
        <GamePanel
          header={
            <>
              <div className="prompt-meta-row">
                <p className="panel-kicker">{modeLabel}</p>
                <p>{activeSession.currentIndex + 1} / 10</p>
              </div>
              <h1 className="question-title">{prompt}</h1>
              <p className="panel-lede">
                {activeSession.mode === "streets" ? "Tap anywhere along its route." : game.selectedAreaLabel}
              </p>
            </>
          }
          footer={
            <div className="button-stack">
              <Button onClick={game.nextPrompt} disabled={!currentResult}>
                {activeSession.currentIndex === 9 ? "See your score" : "Next question"}
              </Button>
              <Button variant="secondary" onClick={game.returnToSetup}>End session</Button>
            </div>
          }
        >
          <SessionProgress index={activeSession.currentIndex} score={score} attempts={attempts} />
          <RoundFeedback result={currentResult} currentStreetNote={currentStreet?.teachingNote ?? currentIntersection?.teachingNote} />
        </GamePanel>
      }
    >
      <MapStage
        guess={guess}
        intersections={activeSession.mode === "intersections" ? game.activeIntersections : undefined}
        onGuess={game.submitCoordinate}
        onNext={game.nextPrompt}
        question={{ id: promptId, answer: currentIntersection }}
        result={currentResult ? { isCorrect: currentResult.mode === "streets" ? currentResult.result.correct : currentResult.result.isCorrect } : null}
        highlightedStreets={highlights}
        pendingGuess={activeSession.pendingGuess}
        onPendingGuessChange={game.setPendingGuess}
        resultDescription={resultDescription}
        streetGeometry={activeSession.mode === "streets" ? game.streetGeometry : undefined}
        nextLabel={activeSession.currentIndex === 9 ? "See your score" : "Next question"}
      />
    </AppShell>
  );
}

function ModeChooser({ selected, onChange }: { selected: "intersections" | "streets"; onChange: (mode: "intersections" | "streets") => void }) {
  return (
    <fieldset className="mode-chooser">
      <legend>Game mode</legend>
      <div>
        <button
          aria-pressed={selected === "streets"}
          className={selected === "streets" ? "active" : ""}
          type="button"
          onClick={() => onChange("streets")}
        >
          <span>Find streets</span>
          {selected === "streets" ? <span className="mode-chooser-check" aria-hidden="true">✓</span> : null}
        </button>
        <button
          aria-pressed={selected === "intersections"}
          className={selected === "intersections" ? "active" : ""}
          type="button"
          onClick={() => onChange("intersections")}
        >
          <span>Find intersections</span>
          {selected === "intersections" ? <span className="mode-chooser-check" aria-hidden="true">✓</span> : null}
        </button>
      </div>
    </fieldset>
  );
}

function ModeCard({ mode }: { mode: "intersections" | "streets" }) {
  return (
    <section className="mode-card">
      <strong>10 questions · 40 points</strong>
      <p>{mode === "streets" ? "Drop pins on 10 roads from across the valley. Every round mixes up the route." : "Find eight intersections, then get another shot at two that slipped by."}</p>
      <small>Progress stays in this browser. No account needed.</small>
    </section>
  );
}

function SessionProgress({ index, score, attempts }: { index: number; score: number; attempts: readonly { score: number }[] }) {
  return (
    <section className="session-progress" aria-label="Round progress">
      <div><span>Score</span><strong>{score}<small>/40</small></strong></div>
      <div><span>Question</span><strong>{index + 1}<small>/10</small></strong></div>
      <div className="score-dots" aria-label={`${attempts.length} answered`}>
        {Array.from({ length: 10 }, (_, dot) => <i key={dot} className={dot < attempts.length ? `earned score-${attempts[dot]?.score}` : dot === index ? "current" : ""} />)}
      </div>
    </section>
  );
}

function RoundFeedback({ result, currentStreetNote }: { result: RoundResult | null; currentStreetNote?: string }) {
  if (!result) return <section className="round-feedback empty"><p>Drop your pin. Close still scores.</p></section>;
  const score = result.mode === "streets" ? result.result.score : result.result.closenessScore;
  const correct = result.mode === "streets" ? result.result.correct : result.result.isCorrect;
  return (
    <section className={`round-feedback ${correct ? "correct" : "miss"}`} aria-live="polite">
      <div className="reward-row"><span>{scoreLabel(correct, score)}</span><strong>+{score}</strong></div>
      <p className="feedback-copy">{feedbackText(result)}</p>
      {currentStreetNote ? <p className="teaching-note">{currentStreetNote}</p> : null}
    </section>
  );
}

function buildHighlights(result: RoundResult | null, targetStreetId?: string): HighlightedStreet[] | undefined {
  if (!result || result.mode !== "streets" || !targetStreetId) return undefined;
  const nearest = result.result.nearestEligibleStreet.id;
  return [
    { id: targetStreetId, kind: "answer", label: result.result.targetStreet.name },
    ...(nearest !== targetStreetId ? [{ id: nearest, kind: "guess" as const, label: result.result.nearestEligibleStreet.name }] : []),
  ];
}

function feedbackText(round: RoundResult): string {
  const feedback = round.feedback;
  if (feedback.kind === "correct") return "Exactly right.";
  if (feedback.kind === "same-road") return `You found the right road. Move ${feedback.direction ?? "along it"}${feedback.streetCount ? ` about ${feedback.streetCount} major street${feedback.streetCount === 1 ? "" : "s"}` : ""}.`;
  if (feedback.kind === "ordered-crossing") return `The target is ${feedback.streetCount} major street${feedback.streetCount === 1 ? "" : "s"} ${feedback.direction}.`;
  if (feedback.kind === "area-direction") return `Look ${feedback.direction} within ${areaName(feedback.areaId)}.`;
  if (feedback.kind === "nearest-known") return `Your tap was closest to ${itemName(feedback.intersectionId)}.`;
  if (feedback.kind === "ordered-neighbor") return `${itemName(feedback.nearestStreetId)} is next door. Move ${feedback.direction}.`;
  if (feedback.kind === "ordered-direction") return `From ${itemName(feedback.nearestStreetId)}, move ${feedback.streetCount} roads ${feedback.direction}.`;
  if (feedback.kind === "general-direction") return `The target runs farther ${feedback.direction}.`;
  if (feedback.kind === "shape-nearest") return `Your tap followed ${itemName(feedback.nearestStreetId)} instead.`;
  if (feedback.kind === "shape-area-direction") return `Look ${feedback.direction} toward ${areaName(feedback.areaId)}.`;
  return feedback.score === 3 ? "You almost had it." : feedback.score === 2 ? "Right neighborhood, wrong block." : feedback.score === 1 ? "Across town, but still on the map." : "Take a look around, then roll on.";
}

function scoreLabel(correct: boolean, score: number) {
  if (correct) return "Nailed it";
  if (score === 3) return "So close";
  if (score === 2) return "In the neighborhood";
  if (score === 1) return "Across town";
  return "Lost in the valley";
}

function intersectionName(intersection?: Intersection) {
  return intersection ? `${intersection.primaryStreet} & ${intersection.crossStreet}` : "Loading question…";
}

function itemName(id: string) {
  const street = getStreetDefinition(id);
  if (street) return street.name;
  const intersection = intersections.find((item) => item.id === id);
  return intersectionName(intersection) || id;
}

function scoreMessage(score: number) {
  if (score >= 32) return "You know these streets.";
  if (score >= 24) return "Pretty solid lap around the valley.";
  if (score >= 16) return "Not bad — the map is starting to click.";
  return "The valley wins this round. Run it back?";
}

function areaName(areaId: string) {
  return isPlayAreaId(areaId) ? getAreaBucketLabel(areaId) : areaId.replaceAll("-", " ");
}

function MapPlaceholder({ message = "Pick a mode and hit the road." }: { message?: string }) {
  return <div className="map-stage map-placeholder"><span className="atlas-route-shield" aria-hidden="true">LV</span><p>{message}</p></div>;
}
