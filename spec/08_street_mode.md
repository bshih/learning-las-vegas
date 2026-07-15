# Learn Streets Mode

## Status

Pending review.

## Objective

Teach where major Las Vegas streets run and how grid streets relate to one another, separately from specific intersections.

## Core Prompt

```text
Find Rampart Boulevard
Tap anywhere along the street.
```

The player answers with one selected coordinate. Do not require drawing, tracing, or dragging a line.

## Guess Selection And Confirmation

### Fine Pointer

Mouse/trackpad users keep the fast current behavior: clicking the map commits the guess immediately.

### Coarse Pointer

Use input capability such as `matchMedia("(pointer: coarse)")`, not user-agent mobile detection.

- The first tap places a pending guess marker but does not score or reveal.
- Another tap moves the pending marker.
- Pan and zoom gestures never commit a guess.
- A fixed `Confirm guess` button commits the pending coordinate.
- The button is disabled until a pending coordinate exists.
- Starting a new prompt clears the pending marker.

Use this same coarse-pointer confirmation behavior in intersection mode.

## Guessing State

- Show road geometry without text-bearing basemap labels.
- Do not show answer or neighboring street names.
- Pan and zoom remain available.
- Start at the valley or selected-group frame.
- The first committed guess completes the prompt.
- V1 has no hint action.

## Scoring Pool

Compare the guess against the target and eligible streets in the same ordered group or comparable axis. Do not compare a north-south target to an intersecting east-west road.

Use shortest geographic distance from the selected coordinate to the target polyline plus nearest eligible street resolution:

- `4`: target is nearest and target-line distance is at most 650 m.
- `3`: target-line distance is at most 1,609.344 m, but the answer did not qualify for `4`.
- `2`: target-line distance is at most 6,000 m.
- `1`: target-line distance is at most 12,000 m.
- `0`: target-line distance is greater than 12,000 m.

A miss may not receive `4`, even when raw distance is inside 650 m. Validate these thresholds against adjacent-road fixtures before adoption.

For shape-group streets, compare against other compatible shape-group candidates and the target distance. Correctness still requires the target to be the nearest eligible street; ordered-neighbor feedback is not required.

## Reveal State

- Restore normal basemap labels.
- Draw the target as the strongest route-red line.
- Mark the player's selected coordinate.
- Draw the nearest eligible wrong street in lower-emphasis navy when known.
- Label the target directly on its line.
- For ordered groups, label immediate neighbors in muted styling.
- For shape groups, preserve a wide enough view to understand the road's path through the valley.
- Provide direct `Next street` from the map.

## Feedback Priority

Ordered groups:

1. Correct street.
2. Adjacent named street.
3. Direction and ordered-street count.
4. General direction.
5. Distance-only rating.

Shape groups:

1. Correct street.
2. Nearest compatible named street when trustworthy.
3. Target area and direction from the guess.
4. Distance-only rating.

Examples:

```text
Right street. You found Rampart Boulevard.
```

```text
You selected closest to Durango. The target is one major street farther west.
```

```text
Rampart curves through the west side; the target line is west of your guess.
```

Never invent ordered-neighbor counts for special-shape streets.

## Session Composition

- Select 5 focus streets from the chosen group using deterministic rotation by that scope's completed-session count.
- Prompts 1-5 present each focus street once.
- Prompts 6-10 present each focus street again.
- Order second appearances by first-attempt weakness while preserving spacing.
- The pre-session briefing displays exactly these 5 streets.

There is no cross-session street mastery or SRS scheduling in V1.

## Map Contract Changes

```ts
type HighlightedStreet = {
  id: string;
  kind: "answer" | "guess" | "neighbor";
  label?: string;
};

type MapViewState = {
  // existing fields
  pendingGuess?: Coordinate;
  streetGeometry?: StreetFeatureCollection;
  highlightedStreets?: readonly HighlightedStreet[];
};
```

The adapter renders geometry and pending state. Scoring and session behavior remain pure library/state concerns.

## Accessibility

- Prompt and feedback are represented outside the map.
- Color is not the only distinction between answer, guess, and neighbor lines.
- Map highlights have equivalent result text.
- Respect `prefers-reduced-motion` for any line reveal.
- Keyboard-only players receive a simple eligible-street answer list for the current group.

## Acceptance

- Player can complete a 10-prompt session with ordered and shape-group streets.
- Street scoring is invariant to zoom level.
- Perpendicular roads do not steal correctness.
- Coarse-pointer taps stage a guess and only `Confirm guess` submits it.
- Panning does not submit a guess.
- Reload restores the current session and pending coordinate.
- Reveal clearly displays the target street and supported context.
