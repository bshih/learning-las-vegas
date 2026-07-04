# Melissa Map V1 Overview

## Goal

Build a playable Las Vegas intersection-training web app.

The V1 product is static-first: no live map/geocoding calls during gameplay. Ship a seed intersection corpus, render an unlabeled or low-label map, ask the player to locate intersections, resolve guesses to the nearest known intersection, reveal the answer, and track local progress.

## Product Loop

1. Prompt the player with an intersection, for example `Flamingo & Rainbow`.
2. Player clicks the map.
3. App resolves the click to the nearest known intersection and marks it correct when the requested intersection is the nearest plausible match.
4. App shows correct/missed feedback, coarse 1-5 closeness points, correct marker, selected marker, and nearby teaching context.
5. Player advances to the next question.

## V1 Scope

- One main mode: click the intersection.
- Static seed data: 100-250 curated Las Vegas intersections.
- Local progress tracking with `localStorage`.
- Functional map, nearest-intersection guess resolution, reveal, next question, reset progress.
- Componentized app shell, game panel, map view, score/reveal view, progress state.
- Themeable CSS with central tokens and simple component classes.

## Deferred

- Full OSM or Clark County ETL.
- Accounts, leaderboards, friend challenges.
- Manual review/admin UI.
- Street tracing, quadrant mode, ordering mode.
- Custom hosted PMTiles.
- Polished aesthetic pass.

## Technical Direction

Preferred stack for V1:

- React + Vite + TypeScript.
- MapLibre GL JS for map rendering if feasible.
- Static JSON for intersections.
- CSS variables for theme tokens.
- Local app state plus `localStorage`.

If MapLibre setup blocks a fast playable V1, use a lightweight SVG/canvas coordinate-map fallback with a clean adapter seam so MapLibre can replace it later.

## Parallel Workstreams

1. App shell and game loop.
2. Map/data layer.
3. Seed corpus and QA fixtures.

Keep file ownership tight. Do not overwrite another thread's files without checking current contents first.
