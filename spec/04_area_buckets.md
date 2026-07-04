# Area Buckets

## Objective

Let players choose a specific Las Vegas area before playing, while keeping `All Areas` as the default.

## Data Shape

Each seed intersection keeps its descriptive `region`. Gameplay derives a normalized `area` bucket for filtering.

Supported buckets:

- `summerlin-west`
- `spring-valley-southwest`
- `strip-paradise`
- `downtown-central-east`
- `north-las-vegas-northwest`
- `henderson-green-valley`

## Requirements

- Expose `All Areas` plus each supported bucket in the start/sidebar UI.
- Filter the question deck and nearest-intersection scoring pool to the selected bucket.
- Reset the current deck when the player changes buckets.
- Persist the selected bucket with local progress.
- Keep every bucket at or above 10 intersections before exposing it as a playable option.

## Acceptance

- User can start in `All Areas` or choose a specific bucket.
- Area-specific prompts only draw from that bucket.
- Reset clears progress for the currently selected area.
- Seed validation fails if an exposed bucket has fewer than 10 intersections.
