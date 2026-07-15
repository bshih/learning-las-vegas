# Sessions And Local Progress

## Status

Pending review.

## Objective

Replace endless deterministic progression and lifetime counters with fixed 10-prompt sessions and simple local persistence. V1 deliberately avoids a mastery model, SRS, or cross-session performance scheduler.

## Session Selection

### Learn Streets

- Choose 5 focus streets from the selected group.
- Rotate deterministically through the group using completed-session count for that scope.
- Present each focus street once, then repeat all 5 once.
- Use first-attempt performance only to order the repeat half.

### Find Intersections

- Choose 8 distinct intersections with the existing deterministic seeded deck, offset by completed-session count for that area.
- After prompt 8, select the 2 weakest attempts for prompts 9 and 10.
- Rank weakness by incorrect result, lower score, then earlier prompt.

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
};

type ActiveSession = {
  id: string;
  mode: "streets" | "intersections";
  scopeId: string;
  focusItemIds: string[];
  repeatItemIds: string[];
  currentIndex: number;
  attempts: SessionAttempt[];
};

type LastSession = {
  mode: "streets" | "intersections";
  scopeId: string;
  score: number;
  missedItemIds: string[];
};

type ScopeSummary = {
  sessionsCompleted: number;
  bestScore: number;
};

type LocalProgressV2 = {
  version: 2;
  selectedMode: "streets" | "intersections";
  selectedAreaId: PlayAreaId;
  selectedStreetGroupId?: string;
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
- Remove streak, lifetime accuracy, and lifetime points from the primary UI.

## Reset And Exit

- `End session` abandons only the active session after confirmation.
- `Reset local progress` clears V2 session summaries, last-session misses, and active session after confirmation.
- Preserve selected mode/scope after reset.
- Do not retain the current prominent unqualified `Reset` action.

## Implementation Surface

- `src/lib/sessionDeck.ts`: deterministic selection and session-local repeat choice.
- `src/state/localProgress.ts`: V2 load, migration, persistence, and active-session transitions.
- Mode-specific game loops consume the shared session contract.
- Do not put session policy inside React components or the map adapter.

## Automated Verification

Cover:

- 10-prompt fixed length.
- Street focus selection and second-half repetition.
- Intersection weakest-two repetition.
- Deterministic scope rotation.
- Retry-misses seeding.
- V1 selected-area migration.
- Reload restoration, including pending coarse-pointer guesses.

Check current official documentation and package health before adding any test dependency.

## Acceptance

- Every session ends after exactly 10 prompts and a maximum of 40 points.
- Street sessions repeat all 5 focus streets.
- Intersection sessions repeat the 2 weakest of the first 8.
- No mastery, SRS, daily, or streak state exists.
- Refresh restores the exact session and prompt.
- Retry misses uses only the immediately previous session.
