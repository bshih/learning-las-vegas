# Melissa Map Design

## Reference

- Product direction: a late-1950s American glovebox road atlas—cream paper, dark blue cartographic ink, route-marker red, muted land green, geometric sans titles, condensed road lettering, fine rules, and squared utility controls.
- Map reference: Google Maps road hierarchy and label behavior. Major roads should read first, local streets should stay quiet, and labels should appear progressively as the player zooms.
- Usability reference: the existing Melissa Map game loop. The atlas treatment must preserve the map-first layout, immediate prompt, obvious area selector, and high-contrast reveal actions.

## Typography

- Display type uses Google Fonts `Jost` at 500-800 as a practical Futura-adjacent geometric sans for the masthead, prompts, scores, and answer callouts.
- Road, legend, metadata, and map-label language uses Google Fonts `Barlow Condensed` at 400-700 for a narrower highway-sign character.
- UI and body type uses Google Fonts `Source Sans 3` at 400-700 for compact clarity.
- Map labels retain OpenFreeMap's vector placement, collision handling, and zoom-level detail, but the style is transformed at load time to use locally rendered Jost and Barlow Condensed glyphs.
- Display text uses tight natural spacing. Letter spacing is limited to small navigational metadata and labels, where atlas legends traditionally use it.
- Body text stays near 16px with approximately 1.45 line height; compact metadata never drops below 0.67rem on mobile.

## Color

- Canvas: paper-board tan `#d8d1bd`
- Paper: warm cream `#f2ecd9`
- Surface: light atlas paper `#f7f1df`
- Secondary surface: aged cream `#ece4ce`
- Primary text and rules: cartographic navy `#19334a`
- Muted text: gray-green `#5e675f`
- Fine border: `#9b927b`
- Route accent / correct marker: `#b54132`
- Land accent: `#697f62`
- Focus: high-visibility amber `#f0b448`
- Guess marker: cartographic navy `#19334a`
- Map: OpenFreeMap Bright, with clean road hierarchy and restrained land-use color.

## Spacing And Shape

- `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, and `2rem` spacing scale.
- Corners are nearly square: 2-3px. The map itself has square corners.
- Shadows are crisp 2-4px offsets, like stacked paper, rather than soft floating-card shadows.
- The desktop shell keeps a dominant map and a fixed-width 390px field-guide sidebar. Mobile stacks map before controls.

## Map Behavior

- Hide every text-bearing basemap symbol layer while the player is guessing, including roads, neighborhoods, POIs, and airport labels.
- Restore native vector labels after reveal; do not generate separate learning tags.
- Keep the exact-answer callout visually stronger than ordinary map labels.
- Show one enlarged “Nailed it” marker for correct guesses; reserve separate Guess/Correct markers for misses.
- Preserve pan and zoom during reveal; reset to the valley frame for a new question.
- Maintain source attribution in the map viewport.

## Do

- Let vector-tile zoom levels and collision handling determine label density.
- Keep local streets visible but subordinate to arterials and highways.
- Use familiar map controls and retain a reset-to-valley command.
- Make the reveal-state map overlay a direct Next action.
- Use paper, ink, rules, and route-red accents consistently; decorative texture must stay low contrast.
- Use geometric display type for identity and prompts, condensed sans for road/legend language, and the body sans for explanations.

## Don't

- Do not process raster tiles or draw synthetic road-name tags.
- Do not show POI clutter while guessing.
- Do not use rounded pill cards, generic blue SaaS controls, slab-serif nostalgia, distressed novelty fonts, or fake paper stains.
- Do not let the atlas styling reduce map area, tap targets, focus visibility, or text contrast.
- Do not change scoring or question order as part of visual design work.
