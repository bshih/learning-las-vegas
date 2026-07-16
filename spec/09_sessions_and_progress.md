# Sessions And Local Progress

## Status

Implemented; street-session policy revised on 2026-07-14.

## Objective

Replace endless deterministic progression and lifetime counters with fixed 10-prompt sessions and simple local persistence. V1 deliberately avoids a mastery model, SRS, or cross-session performance scheduler.

## Session Selection

### Find Streets

- Choose 10 distinct streets from the full playable street pool.
- Rotate deterministically through the pool using completed-session count for the all-streets scope.
- Continue from the prior 10-item window so all streets receive coverage before recycling.
- Do not repeat streets within a normal session.

### Find Intersections

- Choose 10 distinct intersections with the existing deterministic seeded deck, offset by completed-session count for that area.
- Continue through the area pool across rounds before recycling prompts.
- Use the explicit retry-misses action when the player wants repetition.

This is session-local repetition, not a long-term recall scheduler.

## Retry Behavior

The summary offers:

- `Retry this route`: start another session in the same mode/scope.
- `Retry misses`: seed the next session with the last session's incorrect items, then fill remaining distinct slots from the normal deterministic deck.
- `Change mode or area`: return to the minimal selectors.

Only the immediately previous completed session's misses are retained. Completing a new session replaces them.

## Persistence Schema

Introduce `melissa-map-progress-v2`:

```ts
type SessionAttempt = {
  itemId: string;
  score: 0 | 1 | 2 | 3 | 4;
  correct: boolean;
  elapsedMs: number;
};

type ActiveSession = {
  id: string;
  mode: "streets" | "intersections";
  scopeId: string;
  focusItemIds: string[];
  currentIndex: number;
  attempts: SessionAttempt[];
  questionStartedAt: number;
};

type LastSession = {
  mode: "streets" | "intersections";
  scopeId: string;
  score: number;
  missedItemIds: string[];
  totalTimeMs: number;
  averageTimeMs: number;
};

type ScopeSummary = {
  sessionsCompleted: number;
  bestScore: number;
};

type LocalProgressV2 = {
  version: 2;
  selectedMode: "streets" | "intersections";
  selectedAreaId: PlayAreaId;
  scopes: Record<string, ScopeSummary>;
  activeSession?: ActiveSession;
  lastSession?: LastSession;
};
```

Implementation may normalize the shape but must preserve these semantics. Do not add per-item histories, successful-session arrays, due dates, mastery labels, or streak state.

## V1 Migration

- Read V1 only when V2 does not exist.
- Preserve the selected area if valid.
- Do not convert aggregate answered, points, accuracy, or streak fields into V2 progress.
- Keep V1 storage untouched for rollback; all new writes use V2.

## Session Score

- Each prompt awards `0-4`.
- A 10-prompt session has a maximum of 40.
- Store best score and completed-session count per mode/scope.
- Time each question from prompt display until the guess is submitted. Show round total and per-question average on the summary without displaying a countdown during play.
- Remove streak, lifetime accuracy, and lifetime points from the primary UI.

## Reset And Exit

- `End session` abandons only the active session after confirmation.
- `Reset local progress` clears V2 session summaries, last-session misses, and active session after confirmation.
- Preserve selected mode/scope after reset.
- Do not retain the current prominent unqualified `Reset` action.

## Implementation Surface

- `src/lib/sessionDeck.ts`: deterministic distinct-item selection and scope rotation.
- `src/state/localProgress.ts`: V2 load, migration, persistence, and active-session transitions.
- Mode-specific game loops consume the shared session contract.
- Do not put session policy inside React components or the map adapter.

## Automated Verification

Cover:

- 10-prompt fixed length.
- Ten-distinct-street selection and full-pool rotation.
- Ten-distinct-intersection selection and full-pool rotation.
- Deterministic scope rotation.
- Retry-misses seeding.
- V1 selected-area migration.
- Reload restoration, including pending coarse-pointer guesses.

Check current official documentation and package health before adding any test dependency.

## Acceptance

- Every session ends after exactly 10 prompts and a maximum of 40 points.
- Street sessions contain 10 distinct streets from the full pool.
- Intersection sessions contain 10 distinct crossings.
- No mastery, SRS, daily, or streak state exists.
- Refresh restores the exact session and prompt.
- Retry misses uses only the immediately previous session.
