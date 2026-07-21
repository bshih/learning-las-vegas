# Motion Polish

## Status

Implemented and verified locally.

## Goal

Use brief motion to confirm input and explain state changes without competing with the map or delaying play.

## Effects

- **Press feedback:** primary buttons and the map action press into their offset shadow at `0.97` scale.
- **Mode check:** the selected checkmark fades and scales in when the mode changes.
- **Round summary:** score, judgment, timing, and miss card rise in with a 40 ms stagger.
- **About dialog:** the native dialog and backdrop scale and fade on open and close.

The existing exact-hit reward stays unchanged.

## Constraints

- New motion changes only `transform` and `opacity`.
- Every effect finishes within 240 ms and never blocks an action.
- Hover movement runs only on fine pointers.
- `prefers-reduced-motion` removes scaling, translation, and stagger. Color and opacity feedback remain.
- No motion is added to prompts, map navigation, misses, or ordinary content changes.

## Verification

- `npm run build`
- Desktop browser pass: mode switch, button press, About open/close, full round summary, console.
- 390 px browser pass for touch layout.
- Reduced-motion browser pass for the same state changes.
