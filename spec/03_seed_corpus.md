# Seed Corpus

## Objective

Create a useful hand-curated V1 question set while leaving room for an ETL pipeline later.

## Owns

- `src/data/intersections.*`
- `src/data/streets.*`
- `src/data/seed-notes.md`
- Optional scripts for validating seed data.

## Data Shape

Each intersection should include:

- stable `id`
- `streetA`
- `streetB`
- `lat`
- `lon`
- `region`
- `difficulty`
- `aliases`
- optional `teachingNote`

## Seed Targets

Aim for 100-250 intersections if practical. If time is tight, prioritize 50 high-quality questions over a larger shaky list.

Include a mix of:

- Sahara, Charleston, Flamingo, Tropicana, Spring Mountain.
- Rainbow, Decatur, Jones, Buffalo, Durango, Fort Apache.
- Eastern, Maryland, Lamb, Nellis.
- Summerlin, Henderson, North Las Vegas, Strip/airport-area anchors.

## Quality Bar

- Prefer known major arterials.
- Avoid questionable non-intersections.
- Flag uncertain points in `seed-notes.md`.
- Keep coordinates reasonably accurate; exact survey-grade accuracy is not required for V1.

