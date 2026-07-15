# Learning Game

## Status

Implemented; revised after playtesting on 2026-07-14.

## Objective

Turn Melissa Map from an endless intersection quiz into a small, replayable learning game for people who are new to Las Vegas. Teach both the position of major streets and the intersections formed by those streets while preserving the static-first architecture.

## Product Principles

- Teach a mental model of the valley, not isolated coordinates.
- Build broad street coverage across sessions rather than drilling a tiny set twice.
- Make every useful miss explain a spatial relationship.
- Use short sessions with an ending instead of lifetime-stat accumulation.
- Keep the game private, local, and low-pressure.

## Modes

### Learn Streets

The player locates an entire named street by tapping where it runs. Reveal highlights the full street and, when appropriate, relates it to nearby parallel streets.

Important curving, branching, or regional streets remain playable. They receive shape/area feedback rather than fabricated parallel-road ordering.

### Find Intersections

The existing click-the-intersection game remains. It gains bounded sessions, session-local repetition, comparative spatial feedback, and a proper session summary.

The modes are independent. Neither mode is gated behind the other.

## Score Contract

- Every prompt awards `0-4` points.
- `4` is reserved for a correct street or intersection resolution.
- Partial-credit misses receive `0-3`.
- Every session contains 10 prompts and has a maximum score of 40.
- No multipliers, streak bonuses, or lifetime-point economy alter the score.

## Session Contract

### Learn Streets

- Select 10 distinct streets from the full playable pool.
- Rotate through all playable streets across sessions before recycling them.
- Do not repeat a street within a normal session.
- `Practice misses` may seed the next session with streets missed in the immediately previous session.

### Find Intersections

- Prompts 1-8 contain distinct intersections.
- Prompts 9 and 10 repeat the 2 weakest items from prompts 1-8.
- Rank weakness by incorrect resolution, then lower score, then earlier attempt.

For both modes:

- Reloading restores an unfinished session at its current prompt.
- Prompt 10 opens a summary rather than continuing into an endless deck.
- The summary can replay the same scope, retry the last misses, or change mode/scope.

## Navigation

Keep navigation minimal:

- A mode control for `Learn streets` and `Find intersections`.
- The existing area selector for intersection scope.
- A single full-valley street pool; no street-group selector.
- A single `Start 10-question session` action.

Do not build a home dashboard, onboarding carousel, recommendation engine, or locked progression for V1.

## Hosting And Persistence

- The app remains a static Vite build on here.now.
- Lesson definitions and street geometry ship as static JSON/GeoJSON.
- No database, account, server function, live geocoder, or runtime corpus request is required.
- `localStorage` keeps the active session, selected mode/scope, session counts, best scores, and last-session misses.
- Progress is browser/device-local and may be lost when site data is cleared.
- here.now Site Data is out of scope.

## Existing Behavior To Preserve

- MapLibre with OpenFreeMap Bright.
- Hidden text labels while guessing and labels on reveal.
- Geographic scoring rather than screen-pixel scoring.
- Area-filtered intersection decks and scoring pools.
- Always-visible map attribution.
- Desktop map-first layout and usable mobile layout.

## Explicitly Out Of Scope

- Per-item mastery states, spaced-repetition dates, or a cross-session scheduler.
- Hints.
- Accounts, identity, leaderboards, friend rankings, or shared progress.
- Daily challenges, login streaks, or streak rewards.
- Timers, lives, energy, power-ups, badges, or currencies.
- First-visit onboarding flows.
- Freehand street drawing.
- Live routing, search, geocoding, or corpus generation.
- A major corpus expansion before the new loops are proven.

## Release Definition

- A player can complete and resume a 10-prompt session in either mode.
- Street mode includes both ordered grid streets and important special-shape streets.
- Street sessions broaden coverage; explicit miss practice supplies repetition when requested.
- Intersection misses explain a supported spatial relationship when one exists.
- The summary shows score, last-session misses, and clear replay choices.
- The full experience remains a static here.now deployment.
