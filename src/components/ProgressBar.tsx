import type { ProgressState } from "../state/types";

type ProgressBarProps = {
  progress: ProgressState;
};

export function ProgressBar({ progress }: ProgressBarProps) {
  const accuracy =
    progress.answered === 0
      ? 0
      : Math.round(((progress.answered - progress.missed) / progress.answered) * 100);

  return (
    <section className="progress-card" aria-label="Local progress">
      <div className="progress-stats">
        <span>
          <strong>{progress.answered}</strong>
          <small>answered</small>
        </span>
        <span>
          <strong>{progress.streak}</strong>
          <small>streak</small>
        </span>
        <span>
          <strong>{accuracy}%</strong>
          <small>accuracy</small>
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${Math.min(progress.streak * 10, 100)}%` }} />
      </div>
    </section>
  );
}
