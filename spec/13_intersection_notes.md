# Intersection Notes

## Status

Implemented as a 12-intersection editorial set on 2026-07-20.

## Objective

Give selected intersection reveals one concise, sourced local fact worth remembering. Favor casino and resort history, landmarks, boundaries, public art, and other place-specific stories over routine grid instructions.

## Contract

- Notes appear only after a reveal in Find intersections mode.
- Each note belongs to one stable intersection ID and contains a category, title, 25-45 word body, source label, and HTTPS source.
- The reveal shows at most one local note. It never expands both streets' roadside notes inline.
- Intersections without a strong fact render no note and no empty placeholder.
- Coverage is not a goal. A note must be tied to the crossing and interesting enough to repeat to someone else.
- Notes ship as static local data. Gameplay makes no runtime research or content request.

## Initial Set

- Flamingo Road and Las Vegas Boulevard: casino-name history.
- Tropicana Avenue and Las Vegas Boulevard: the demolished resort's name remains on the road.
- Sahara Avenue and Las Vegas Boulevard: the City of Las Vegas boundary.
- Charleston Boulevard and Eastern Avenue: the restored Blue Angel at Five Points.
- Charleston Boulevard and Buffalo Drive: All American Park as a west-side marker.
- Charleston Boulevard and Durango Drive: Angel Park and Durango's chain of park markers.
- Tropicana Avenue and Maryland Parkway: UNLV's dirt-road beginning.
- Sunset Road and Eastern Avenue: the three-road frame around Sunset Park.
- Lake Mead Parkway and Boulder Highway: Boulder Highway before the freeway.
- Sunset Road and Stephanie Street: Stephanie Page Wurzer's namesake road.
- Warm Springs Road and Paradise Road: Roy Rogers' Warm Springs Ranch.
- Russell Road and Las Vegas Boulevard: the Welcome sign just south of the crossing.

## Release Checks

- `npm run validate:streets`
- `npm run validate:seed`
- `npm run test:learning`
- `npm run build`
- Browser verification of a covered intersection reveal.
- Browser verification that an uncovered intersection renders no empty local-note card.
- Browser verification that street roadside notes remain unchanged.
