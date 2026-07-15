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
                <p className="panel-kicker">Choose a lesson</p>
                <h1 className="panel-title">Learn the valley, one short run at a time.</h1>
              </>
            }
            footer={<Button onClick={() => game.startSession()}>Start 10 questions</Button>}
          >
            <ModeChooser selected={progress.selectedMode} onChange={game.selectMode} />
            {progress.selectedMode === "intersections" ? (
              <AreaChooser
                areaOptions={game.areaOptions}
                selectedAreaId={game.selectedAreaId}
                onAreaChange={game.selectArea}
              />
            ) : (
              <StreetGroupChooser game={game} />
            )}
            <LessonCard mode={progress.selectedMode} />
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
                <p className="panel-kicker">Session complete</p>
                <h1 className="score-title">{game.lastSession.score}<span>/40</span></h1>
                <p className="panel-lede">
                  {game.lastSession.isNewBest ? "New best for this lesson." : scoreMessage(game.lastSession.score)}
                </p>
              </>
            }
            footer={
              <div className="button-stack">
                {missedNames.length ? (
                  <Button onClick={() => game.startSession({ retryMisses: true })}>Practice misses</Button>
                ) : null}
                <Button variant={missedNames.length ? "secondary" : "primary"} onClick={() => game.startSession()}>
                  Play another 10
                </Button>
                <Button variant="secondary" onClick={game.returnToSetup}>Change lesson</Button>
              </div>
            }
          >
            <section className="summary-card">
              <p className="summary-label">Roads to revisit</p>
              {missedNames.length ? (
                <ul className="miss-list">{missedNames.map((name) => <li key={name}>{name}</li>)}</ul>
              ) : (
                <p className="clean-run">Clean run — every answer found its mark.</p>
              )}
            </section>
          </GamePanel>
        }
      >
        <MapPlaceholder message="Nice run. Pick another lesson or tighten up the misses." />
      </AppShell>
    );
  }

  if (!activeSession) return null;

  const promptId = `${activeSession.id}:${activeSession.currentIndex}`;
  const focusStreets = activeSession.focusItemIds.flatMap((id) => {
    const street = getStreetDefinition(id);
    return street ? [street] : [];
  });

  if (progress.screen === "briefing") {
    return (
      <AppShell
        sidebar={
          <GamePanel
            header={
              <>
                <p className="panel-kicker">Study these five</p>
                <h1 className="panel-title">See the roads before you place them.</h1>
                <p className="panel-lede">The same five return later in a harder order.</p>
              </>
            }
            footer={<Button onClick={game.startPractice}>Hide labels &amp; start</Button>}
          >
            <ol className="briefing-list">
              {focusStreets.map((street) => (
                <li key={street.id}><strong>{street.name}</strong><span>{street.teachingNote}</span></li>
              ))}
            </ol>
          </GamePanel>
        }
      >
        <MapStage
          guess={null}
          onGuess={() => undefined}
          onNext={game.startPractice}
          question={{ id: promptId }}
          result={{ isCorrect: true }}
          resultDescription="Five lesson streets are highlighted for study."
          nextLabel="Hide labels & start"
          streetGeometry={game.streetGeometry}
          highlightedStreets={focusStreets.map((street) => ({ id: street.id, kind: "neighbor", label: street.name }))}
        />
      </AppShell>
    );
  }

  const attempts = activeSession.attempts;
  const score = attempts.reduce((total, attempt) => total + attempt.score, 0);
  const modeLabel = activeSession.mode === "streets" ? "Place the street" : "Find the intersection";
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
                {activeSession.currentIndex === 9 ? "See session result" : "Next question"}
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
        keyboardAnswers={activeSession.mode === "streets" ? focusStreets.map((street) => ({ id: street.id, label: street.name })) : undefined}
        onKeyboardAnswer={game.submitKeyboardStreet}
        pendingGuess={activeSession.pendingGuess}
        onPendingGuessChange={game.setPendingGuess}
        resultDescription={resultDescription}
        streetGeometry={activeSession.mode === "streets" ? game.streetGeometry : undefined}
        nextLabel={activeSession.currentIndex === 9 ? "See session result" : "Next question"}
      />
    </AppShell>
  );
}

function ModeChooser({ selected, onChange }: { selected: "intersections" | "streets"; onChange: (mode: "intersections" | "streets") => void }) {
  return (
    <fieldset className="mode-chooser">
      <legend>Game mode</legend>
      <div>
        <button className={selected === "streets" ? "active" : ""} type="button" onClick={() => onChange("streets")}>Place streets</button>
        <button className={selected === "intersections" ? "active" : ""} type="button" onClick={() => onChange("intersections")}>Find intersections</button>
      </div>
    </fieldset>
  );
}

function StreetGroupChooser({ game }: { game: ReturnType<typeof useLearningGame> }) {
  return (
    <section className="area-chooser">
      <label htmlFor="street-group-select">Street lesson</label>
      <select id="street-group-select" value={game.selectedStreetGroupId} onChange={(event) => game.selectStreetGroup(event.target.value)}>
        {game.streetGroups.map((group) => <option key={group.id} value={group.id}>{group.label} ({group.streetIds.length})</option>)}
      </select>
      <p>{game.selectedStreetGroup?.kind === "shape" ? "Curving and diagonal exceptions" : "Learn the roads in geographic order"}</p>
    </section>
  );
}

function LessonCard({ mode }: { mode: "intersections" | "streets" }) {
  return (
    <section className="lesson-card">
      <strong>10 questions · 40 points</strong>
      <p>{mode === "streets" ? "Study five roads, place each one, then see them again in a tougher order." : "Locate eight intersections, then finish with two targeted repeats."}</p>
      <small>Progress stays in this browser. No account needed.</small>
    </section>
  );
}

function SessionProgress({ index, score, attempts }: { index: number; score: number; attempts: readonly { score: number }[] }) {
  return (
    <section className="session-progress" aria-label="Session progress">
      <div><span>Score</span><strong>{score}<small>/40</small></strong></div>
      <div><span>Question</span><strong>{index + 1}<small>/10</small></strong></div>
      <div className="score-dots" aria-label={`${attempts.length} answered`}>
        {Array.from({ length: 10 }, (_, dot) => <i key={dot} className={dot < attempts.length ? `earned score-${attempts[dot]?.score}` : dot === index ? "current" : ""} />)}
      </div>
    </section>
  );
}

function RoundFeedback({ result, currentStreetNote }: { result: RoundResult | null; currentStreetNote?: string }) {
  if (!result) return <section className="round-feedback empty"><p>Make your best guess. Close answers still earn points.</p></section>;
  const score = result.mode === "streets" ? result.result.score : result.result.closenessScore;
  const correct = result.mode === "streets" ? result.result.correct : result.result.isCorrect;
  return (
    <section className={`round-feedback ${correct ? "correct" : "miss"}`} aria-live="polite">
      <div className="reward-row"><span>{correct ? "Nailed it" : score ? "Good read" : "Not this time"}</span><strong>+{score}</strong></div>
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
  return feedback.score === 3 ? "Very close — within about a mile." : feedback.score === 2 ? "Right part of town." : feedback.score === 1 ? "Across town, but in range." : "Use the revealed route to reset your mental map.";
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
  if (score >= 32) return "Strong map of the valley.";
  if (score >= 24) return "The structure is taking shape.";
  if (score >= 16) return "A useful first pass. The repeats will help.";
  return "Review the misses, then run it back.";
}

function areaName(areaId: string) {
  return isPlayAreaId(areaId) ? getAreaBucketLabel(areaId) : areaId.replaceAll("-", " ");
}

function MapPlaceholder({ message = "Choose a lesson, then the map becomes your game board." }: { message?: string }) {
  return <div className="map-stage map-placeholder"><span className="atlas-route-shield" aria-hidden="true">LV</span><p>{message}</p></div>;
}
