# Roadside Notes

## Status

Implemented for 36 of 38 streets across three editorial passes. The third pass on 2026-07-20 added 12 notes without forcing weak material for the last two roads.

## Objective

Use short, sourced reveal notes to make major Las Vegas streets easier to recognize and remember. A note may explain a landmark, navigation quirk, corridor identity, local history, or name origin; name origins are not the default.

## V1 Contract

- Roadside notes appear only after a reveal in Find streets mode.
- The first pass covered 12 flagship streets; the second expanded coverage to 24 streets; the third added 12 strong stories from the expanded road pool and older gaps.
- Every note has one concise title, one 25-45 word body, a category, and an HTTPS source.
- Notes supplement the existing spatial teaching note rather than replacing scoring or correction feedback.
- The content ships as static local data. Gameplay makes no runtime research, geocoding, or content requests.
- Streets outside the pilot continue to use their existing teaching notes without an empty placeholder.

## Categories

- `landmark`: a place that anchors the street in the player's mental map.
- `navigation`: a name change, paired roadway, boundary, or common source of confusion.
- `corridor`: how the road connects regions or shaped travel through the valley.
- `history`: a past use or change that makes the current road more legible.
- `name-origin`: a documented naming story when it is unusually memorable.

## Editorial Rules

- Prefer recognition value over trivia for trivia's sake.
- Do not state an uncertain origin as fact.
- Keep time-sensitive claims dated in the copy.
- Link to government, institutional, archival, or established local reporting where available.
- Do not overload a reveal with multiple notes; the pilot has one note per street.

## Covered Streets

Thirty-six of the 38 playable streets have sourced notes.

Jones Boulevard and Ann Road remain intentionally uncovered. Add either only when a source supports a fact more distinctive than routine road or development history.

## Release Checks

- `npm run validate:streets`
- `npm run test:learning`
- `npm run build`
- Browser verification of a pilot street reveal at desktop and 390 px.
- Browser verification that a non-pilot street reveal has no empty roadside-note container.
