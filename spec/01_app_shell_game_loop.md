# App Shell and Game Loop

## Objective

Implement the playable quiz experience around the map.

## Owns

- `src/App.tsx`
- `src/components/*`
- `src/state/*`
- `src/styles/*`
- App-level wiring, guess/reveal workflow, local progress.

## Requirements

- Show a current intersection prompt.
- Let the map report a guessed coordinate.
- Resolve the guess to the nearest known intersection.
- Show selected guess marker and correct marker after answer.
- Show concise feedback:
  - correct/missed result
  - coarse 1-5 closeness points
  - nearest known intersection
  - region/neighborhood if available
  - teaching note if available
- Support next question.
- Persist answered/missed counts in `localStorage`.
- Reset local progress.
- Keep UI functional and themeable rather than visually over-designed.

## Component Shape

Suggested components:

- `AppShell`
- `GamePanel`
- `MapStage`
- `QuestionPrompt`
- `ResultSummary`
- `ProgressBar`
- `Button`

## Acceptance

- User can play at least 10 consecutive questions.
- Guessing, reveal, next question, and reset work.
- Components are small and easy to restyle.
- CSS variables live in one obvious theme file.
