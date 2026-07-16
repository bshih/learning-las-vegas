# Feedback And Rewards

## Status

Pending review.

## Objective

Make correct answers satisfying and misses educational without adding competitive systems, onboarding chrome, or a long-term mastery model.

## Feedback Model

Every reveal has three layers:

1. **Outcome:** rating and `0-4` points earned.
2. **Understanding:** the strongest supported spatial relationship.
3. **Session consequence:** whether the item will return later in this session or appears in the final miss list.

The result must remain understandable without inspecting the map.

## Ratings

- `4`: `Nailed it`.
- `3`: `So close`.
- `2`: `In the neighborhood`.
- `1`: `Across town`.
- `0`: `Lost in the valley`.

Only a correct resolution receives `4`.

## Intersection Feedback Priority

For a miss, choose the first supported type:

1. Same-road correction.
2. Ordered crossing correction using curated street groups.
3. Area-relative north/south/east/west direction.
4. Nearest known intersection.
5. Distance tier only.

Examples:

```text
Right road. You found Charleston & Durango. Continue west on Charleston to reach Rampart.
```

```text
You found the west side, but the target is farther north near Sahara.
```

Rules:

- Prefer useful direction over raw meters.
- Include crossing counts only when a complete curated order supports them.
- Do not claim road proximity from an orientation heuristic alone.
- Do not provide contradictory prose and map highlights.
- A `0` result does not invent road-specific advice.
- Curated teaching notes follow the spatial correction rather than replacing it.
- V1 has no hint action or hint-specific feedback.

## Street Feedback

Follow `08_street_mode.md`:

- Ordered groups may name the nearest parallel street, direction, and supported order distance.
- Shape groups explain the target's path/area and general direction without inventing a linear order.
- Both show the selected coordinate and full target line on reveal.

## Immediate Reward Presentation

Correct:

- Retain one enlarged `Nailed it` intersection marker or the strong route-red street line.
- Animate every exact hit with one quick reward-card flash and score pop; intersection markers also receive a stamp and expanding ring.
- Use one restrained reveal transition: marker stamp for intersections or line trace for streets.

Miss:

- Show the partial `+0` to `+3` clearly.
- Emphasize the correction rather than failure language.
- Say `This comes back near the end` only when the session has actually scheduled a repeat.

Motion settles quickly and never blocks `Next`. Respect `prefers-reduced-motion`. Audio, confetti, badges, and collectible stamps are deferred.

## During-Session Progress

Show only:

- `Question N of 10`.
- Current round score.
- A simple 10-position progress treatment.

Do not show streak, lifetime accuracy, lifetime points, mastery, or scheduler terminology.

## Session Summary

After prompt 10, show:

- Session score out of 40.
- Best score for this mode/scope and `New best` when applicable.
- Correct items.
- Items missed at least once.
- Primary action: `Replay the misses` when misses exist, otherwise `Go another 10`.
- Secondary actions: replay scope or change mode/scope.

Do not build an achievement or onboarding system around the summary.

## Language

Voice is concise, local, playful, and encouraging without being childish or coach-like.

Prefer `Nailed it`, `So close`, `In the neighborhood`, and `Lost in the valley` for score labels. Keep directional clues concrete and useful.

Avoid competitive ranks, artificial urgency, casino metaphors, cute achievements, or broad claims that the player has mastered Vegas.

## Visual Direction

Extend `DESIGN.md`:

- Route-red for the answer and main success moment.
- Cartographic navy for the guess.
- Muted land green for contextual neighbor lines.
- Keep squared controls, crisp offset shadows, and map dominance.

Do not add a separate visual-onboarding or achievement layer in V1.

## Core Browser Verification

Browser verification remains required because this is a map UI, but V1 uses four core paths rather than a large product checklist:

1. Complete a street session on desktop and coarse-pointer/mobile layout, including staged confirmation.
2. Complete an intersection session with same-road feedback and weakest-two repeats.
3. Reload during each mode and restore the exact active prompt/pending guess.
4. Finish a session, view the 40-point summary, and retry misses.

Check page and console errors. Verify locally at desktop and 390 px before a shorter production smoke test.

## Release Checks

- `npm run validate:seed`
- `npm run validate:streets`
- Network-backed coordinate/geometry verification, with outages separate from data failures.
- Automated tests for geometry, session selection, migration, and feedback priority.
- `npm run build`
- Core browser paths above.
- Publish only after explicit approval.
