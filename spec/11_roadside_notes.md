# Roadside Notes

## Status

Implemented as a 12-street pilot on 2026-07-16.

## Objective

Use short, sourced reveal notes to make major Las Vegas streets easier to recognize and remember. A note may explain a landmark, navigation quirk, corridor identity, local history, or name origin; name origins are not the default.

## V1 Contract

- Roadside notes appear only after a reveal in Find streets mode.
- The pilot covers 12 flagship streets across the Strip, central valley, west valley, and Henderson.
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

## Pilot Streets

Las Vegas Boulevard, Decatur Boulevard, Maryland Parkway, Charleston Boulevard, Sahara Avenue, Tropicana Avenue, Sunset Road, Spring Mountain Road, Paradise Road, Boulder Highway, Stephanie Street, and Lake Mead Parkway.

## Release Checks

- `npm run validate:streets`
- `npm run test:learning`
- `npm run build`
- Browser verification of a pilot street reveal at desktop and 390 px.
- Browser verification that a non-pilot street reveal has no empty roadside-note container.
