import type { ReactNode } from "react";

type GamePanelProps = {
  children: ReactNode;
  footer: ReactNode;
  header: ReactNode;
};

export function GamePanel({ children, footer, header }: GamePanelProps) {
  return (
    <div className="game-panel">
      <div className="game-panel-header">{header}</div>
      <div className="game-panel-body">{children}</div>
      <div className="game-panel-footer">{footer}</div>
    </div>
  );
}
